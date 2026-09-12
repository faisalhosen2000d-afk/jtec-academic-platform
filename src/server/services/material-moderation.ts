import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/types/database";

type ModerationAction = "approve" | "reject";

type ModerationResult = {
  success: boolean;
  action: ModerationAction;
  materialId: string;
  status: "approved" | "rejected";
};

type EscalationResult = {
  success: boolean;
  escalated: true;
  action: ModerationAction;
  materialId: string;
  escalationId: string;
  status: "pending";
};

type MaterialRow = {
  id: string;
  uploader_id: string;
  department_id: string;
  status: string;
  title: string;
  rejection_reason: string | null;
};

type ActorProfile = {
  id: string;
  role: string;
};

type EscalationRow = {
  id: string;
  moderator_id: string;
  action_type: string;
  target_table: string;
  target_id: string;
  payload: Json | null;
  status: string;
};

/*
 * Staff identity must come from the authenticated server session.
 *
 * Do not use the service-role client for auth identity checks because
 * the service-role client does not carry the browser user's auth.uid().
 */
async function getActorProfile(actorId: string): Promise<ActorProfile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== actorId) {
    throw new Error("Authenticated staff identity could not be verified.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", actorId)
    .single();

  if (error || !data) {
    throw new Error("Staff profile could not be found.");
  }

  return data as ActorProfile;
}

async function getMaterial(
  supabase: ReturnType<typeof createServiceRoleClient>,
  materialId: string,
): Promise<MaterialRow> {
  const { data, error } = await supabase
    .from("materials")
    .select(`
      id,
      uploader_id,
      department_id,
      status,
      title,
      rejection_reason
    `)
    .eq("id", materialId)
    .single();

  if (error || !data) {
    console.error("[material-moderation][getMaterial]", {
      materialId,
      error,
    });

    throw new Error(
      error?.message
        ? `Material lookup failed: ${error.message}`
        : "Material could not be found.",
    );
  }

  return data as MaterialRow;
}

async function getEscalation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  escalationId: string,
): Promise<EscalationRow> {
  const { data, error } = await supabase
    .from("moderator_escalations")
    .select(`
      id,
      moderator_id,
      action_type,
      target_table,
      target_id,
      payload,
      status
    `)
    .eq("id", escalationId)
    .single();

  if (error || !data) {
    throw new Error("Moderation escalation could not be found.");
  }

  return data as EscalationRow;
}

function assertReviewableMaterial(material: MaterialRow) {
  if (material.status !== "pending") {
    throw new Error(
      `Only pending materials can be reviewed. Current status: ${material.status}.`,
    );
  }
}

/*
 * Permission RPCs use auth.uid().
 * Therefore they MUST run through the authenticated server client,
 * not the service-role client.
 */
async function assertCanReviewDirectly(
  actor: ActorProfile,
  departmentId: string,
) {
  if (actor.role === "super_admin") {
    return;
  }

  if (actor.role !== "admin") {
    throw new Error(
      "You do not have permission to directly approve or reject materials.",
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== actor.id) {
    throw new Error("Authenticated staff identity could not be verified.");
  }

  const { data, error } = await supabase.rpc("can_approve_materials", {
    p_department_id: departmentId,
  });

  if (error) {
    throw new Error(
      `Material approval permission check failed: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "You do not have permission to approve or reject materials for this department.",
    );
  }
}

/*
 * Moderator escalation creation also depends on auth.uid().
 * Use the authenticated server client for the RPC.
 */
async function createModeratorEscalation(
  actorId: string,
  action: ModerationAction,
  material: MaterialRow,
  rejectionReason?: string,
): Promise<EscalationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== actorId) {
    throw new Error(
      "Authenticated moderator identity could not be verified.",
    );
  }

  const payload: Json = {
    department_id: material.department_id,
    title: material.title,
    ...(action === "reject" && {
      rejection_reason: rejectionReason,
    }),
  };

  const { data, error } = await supabase.rpc(
    "create_moderator_escalation",
    {
      p_action_type: `material.${action}`,
      p_target_table: "materials",
      p_target_id: material.id,
      p_payload: payload,
    },
  );

  if (error || !data) {
    throw new Error(
      error?.message ?? "Moderation escalation could not be created.",
    );
  }

  return {
    success: true,
    escalated: true,
    action,
    materialId: material.id,
    escalationId: data as string,
    status: "pending",
  };
}

async function writeAuditLog(
  supabase: ReturnType<typeof createServiceRoleClient>,
  actorId: string,
  action: string,
  materialId: string,
  previousState: Json,
  newState: Json,
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: "materials",
    target_id: materialId,
    previous_state: previousState,
    new_state: newState,
  });

  if (error) {
    throw new Error(`Audit log could not be created: ${error.message}`);
  }
}

async function executeApproveMaterial(
  supabase: ReturnType<typeof createServiceRoleClient>,
  actorId: string,
  material: MaterialRow,
): Promise<ModerationResult> {
  const reviewedAt = new Date().toISOString();

  const { data: updatedMaterial, error: updateError } = await supabase
    .from("materials")
    .update({
      status: "approved",
      reviewed_by: actorId,
      reviewed_at: reviewedAt,
      rejection_reason: null,
    })
    .eq("id", material.id)
    .eq("status", "pending")
    .select(`
      id,
      status
    `)
    .single();

  if (updateError || !updatedMaterial) {
    throw new Error(
      updateError?.message ?? "Material could not be approved.",
    );
  }

  await writeAuditLog(
    supabase,
    actorId,
    "material.approved",
    material.id,
    {
      status: material.status,
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: material.rejection_reason,
    },
    {
      status: "approved",
      reviewed_by: actorId,
      reviewed_at: reviewedAt,
      rejection_reason: null,
    },
  );

  return {
    success: true,
    action: "approve",
    materialId: material.id,
    status: "approved",
  };
}

async function executeRejectMaterial(
  supabase: ReturnType<typeof createServiceRoleClient>,
  actorId: string,
  material: MaterialRow,
  rejectionReason: string,
): Promise<ModerationResult> {
  const reviewedAt = new Date().toISOString();

  const { data: updatedMaterial, error: updateError } = await supabase
    .from("materials")
    .update({
      status: "rejected",
      reviewed_by: actorId,
      reviewed_at: reviewedAt,
      rejection_reason: rejectionReason,
    })
    .eq("id", material.id)
    .eq("status", "pending")
    .select(`
      id,
      status
    `)
    .single();

  if (updateError || !updatedMaterial) {
    throw new Error(
      updateError?.message ?? "Material could not be rejected.",
    );
  }

  await writeAuditLog(
    supabase,
    actorId,
    "material.rejected",
    material.id,
    {
      status: material.status,
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: material.rejection_reason,
    },
    {
      status: "rejected",
      reviewed_by: actorId,
      reviewed_at: reviewedAt,
      rejection_reason: rejectionReason,
    },
  );

  return {
    success: true,
    action: "reject",
    materialId: material.id,
    status: "rejected",
  };
}

export async function approveMaterial(
  actorId: string,
  materialId: string,
): Promise<ModerationResult | EscalationResult> {
  const supabase = createServiceRoleClient();

  const actor = await getActorProfile(actorId);
  const material = await getMaterial(supabase, materialId);

  assertReviewableMaterial(material);

  /*
   * Moderator approval is escalated.
   * The material remains pending until Super Admin resolution.
   */
  if (actor.role === "moderator") {
    return createModeratorEscalation(
      actorId,
      "approve",
      material,
    );
  }

  await assertCanReviewDirectly(
    actor,
    material.department_id,
  );

  return executeApproveMaterial(
    supabase,
    actorId,
    material,
  );
}

export async function rejectMaterial(
  actorId: string,
  materialId: string,
  rejectionReason: string,
): Promise<ModerationResult | EscalationResult> {
  const reason = rejectionReason.trim();

  if (!reason) {
    throw new Error("A rejection reason is required.");
  }

  if (reason.length > 2000) {
    throw new Error("Rejection reason is too long.");
  }

  const supabase = createServiceRoleClient();

  const actor = await getActorProfile(actorId);
  const material = await getMaterial(supabase, materialId);

  assertReviewableMaterial(material);

  /*
   * Moderator rejection is escalated.
   * The material remains pending until Super Admin resolution.
   */
  if (actor.role === "moderator") {
    return createModeratorEscalation(
      actorId,
      "reject",
      material,
      reason,
    );
  }

  await assertCanReviewDirectly(
    actor,
    material.department_id,
  );

  return executeRejectMaterial(
    supabase,
    actorId,
    material,
    reason,
  );
}

export async function resolveMaterialEscalation(
  superAdminId: string,
  escalationId: string,
  approve: boolean,
): Promise<ModerationResult | null> {
  const serviceSupabase = createServiceRoleClient();

  const actor = await getActorProfile(superAdminId);

  if (actor.role !== "super_admin") {
    throw new Error(
      "Only Super Admin may resolve material escalations.",
    );
  }

  const escalation = await getEscalation(
    serviceSupabase,
    escalationId,
  );

  if (escalation.status !== "pending") {
    throw new Error(
      `This escalation has already been resolved. Current status: ${escalation.status}.`,
    );
  }

  if (escalation.target_table !== "materials") {
    throw new Error(
      "This escalation does not target the materials table.",
    );
  }

  if (
    escalation.action_type !== "material.approve" &&
    escalation.action_type !== "material.reject"
  ) {
    throw new Error(
      "Unsupported material escalation action.",
    );
  }

  const material = await getMaterial(
    serviceSupabase,
    escalation.target_id,
  );

  assertReviewableMaterial(material);

  /*
   * The escalation resolution RPC uses auth.uid(), so it must
   * use the authenticated server client.
   */
  const authSupabase = await createClient();

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user || user.id !== superAdminId) {
    throw new Error(
      "Authenticated Super Admin identity could not be verified.",
    );
  }

  if (!approve) {
    const { error } = await authSupabase.rpc(
      "resolve_moderator_escalation",
      {
        p_escalation_id: escalationId,
        p_approve: false,
      },
    );

    if (error) {
      throw new Error(
        `Escalation could not be denied: ${error.message}`,
      );
    }

    return null;
  }

  const payload = escalation.payload ?? {};

  /*
   * Super Admin approval executes the originally escalated
   * material action server-side.
   */
  let result: ModerationResult;

  if (escalation.action_type === "material.approve") {
    result = await executeApproveMaterial(
      serviceSupabase,
      superAdminId,
      material,
    );
  } else {
    const reason =
      typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload) &&
      typeof payload.rejection_reason === "string"
        ? payload.rejection_reason.trim()
        : "";

    if (!reason) {
      throw new Error(
        "The escalated rejection does not contain a valid rejection reason.",
      );
    }

    if (reason.length > 2000) {
      throw new Error("Rejection reason is too long.");
    }

    result = await executeRejectMaterial(
      serviceSupabase,
      superAdminId,
      material,
      reason,
    );
  }

  const { error } = await authSupabase.rpc(
    "resolve_moderator_escalation",
    {
      p_escalation_id: escalationId,
      p_approve: true,
    },
  );

  if (error) {
    throw new Error(
      `Material action completed, but escalation could not be resolved: ${error.message}`,
    );
  }

  return result;
}
