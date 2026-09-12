"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type NoticeActionResult =
  | {
      success: true;
      noticeId: string;
    }
  | {
      success: false;
      error: string;
    };

function nullableValue(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function publishNotice(
  formData: FormData,
): Promise<NoticeActionResult> {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Authentication
    // --------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to publish a notice.",
      };
    }

    // --------------------------------------------------
    // 2. Get current user's role
    // --------------------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email, department_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: "Your profile could not be found.",
      };
    }

    if (!["admin", "super_admin"].includes(profile.role)) {
      return {
        success: false,
        error: "You are not authorized to publish notices.",
      };
    }

    // --------------------------------------------------
    let publisherDepartmentName: string | null = null;

    if (profile.department_id) {
      const { data: publisherDepartment } = await supabase
        .from("departments")
        .select("name")
        .eq("id", profile.department_id)
        .single();

      publisherDepartmentName = publisherDepartment?.name ?? null;
    }

    // 3. Read form fields
    // --------------------------------------------------

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    const categoryId = nullableValue(
      formData.get("category_id"),
    );

    const customCategoryName = nullableValue(
      formData.get("custom_category"),
    );

    const departmentId = nullableValue(
      formData.get("target_department_id"),
    );

    const batchId = nullableValue(
      formData.get("target_batch_id"),
    );

    const levelId = nullableValue(
      formData.get("target_level_id"),
    );

    const termId = nullableValue(
      formData.get("target_term_id"),
    );

    const isPinned =
      formData.get("is_pinned") === "on";

    const attachmentEntry = formData.get("attachment");

    const attachment =
      attachmentEntry instanceof File &&
      attachmentEntry.size > 0
        ? attachmentEntry
        : null;

    // --------------------------------------------------
    // 4. Basic validation
    // --------------------------------------------------

    if (!title) {
      return {
        success: false,
        error: "Notice title is required.",
      };
    }

    if (title.length > 300) {
      return {
        success: false,
        error: "Notice title is too long.",
      };
    }

    if (!content) {
      return {
        success: false,
        error: "Notice content is required.",
      };
    }

    if (content.length > 20000) {
      return {
        success: false,
        error: "Notice content is too long.",
      };
    }

    // --------------------------------------------------
    // 4A. Validate Attachment
    // --------------------------------------------------

    if (attachment) {
      const maxAttachmentSize = 100 * 1024 * 1024;

      const allowedMimeTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]);

      const allowedExtensions = new Set([
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png",
        ".doc",
        ".docx",
      ]);

      const fileName = attachment.name.trim();
      const extension = fileName.includes(".")
        ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
        : "";

      if (attachment.size > maxAttachmentSize) {
        return {
          success: false,
          error: "Attachment size cannot exceed 100 MB.",
        };
      }

      if (
        !allowedExtensions.has(extension) ||
        !allowedMimeTypes.has(attachment.type)
      ) {
        return {
          success: false,
          error:
            "Invalid attachment. Allowed formats: PDF, JPG, JPEG, PNG, DOC, or DOCX.",
        };
      }
    }
    // --------------------------------------------------
    // 5. Determine target scope
    // --------------------------------------------------

    /*
     * Approved architecture:
     *
     * All Students:
     *   department = null
     *   batch = null
     *   level = null
     *   term = null
     *
     * Department targeting:
     *   department is required
     *   batch/level/term are optional filters
     *
     * Level/Term are never college-wide on their own.
     */

    const targetScope = departmentId
      ? "department"
      : "all";

    if (
      targetScope === "all" &&
      (batchId || levelId || termId)
    ) {
      return {
        success: false,
        error:
          "Batch, Level, or Term targeting requires a Department.",
      };
    }

    // --------------------------------------------------
    // 6. Permission check
    // --------------------------------------------------

    const { data: allowed, error: permissionError } =
      await supabase.rpc("can_publish_notices", {
        p_department_id: departmentId ?? undefined,
      });

    if (permissionError) {
      console.error(
        "Notice permission check error:",
        permissionError,
      );

      return {
        success: false,
        error:
          "Notice publishing permission could not be verified.",
      };
    }

    if (!allowed) {
      return {
        success: false,
        error:
          "You do not have permission to publish notices.",
      };
    }
    // --------------------------------------------------
    // 7. Validate Department
    // --------------------------------------------------

    if (departmentId) {
      const { data: department, error } = await supabase
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .single();

      if (error || !department) {
        return {
          success: false,
          error: "Selected department was not found.",
        };
      }
    }

    // --------------------------------------------------
    // 8. Validate Batch
    // --------------------------------------------------

    if (batchId) {
      const { data: batch, error } = await supabase
        .from("batches")
        .select("id")
        .eq("id", batchId)
        .single();

      if (error || !batch) {
        return {
          success: false,
          error: "Selected batch was not found.",
        };
      }
    }

    // --------------------------------------------------
    // 9. Validate Level
    // --------------------------------------------------

    if (levelId) {
      const { data: level, error } = await supabase
        .from("levels")
        .select("id")
        .eq("id", levelId)
        .single();

      if (error || !level) {
        return {
          success: false,
          error: "Selected level was not found.",
        };
      }
    }

    // --------------------------------------------------
    // 10. Validate Term
    // --------------------------------------------------

    if (termId) {
      const { data: term, error } = await supabase
        .from("terms")
        .select("id, level_id")
        .eq("id", termId)
        .single();

      if (error || !term) {
        return {
          success: false,
          error: "Selected term was not found.",
        };
      }

      /*
       * If both Level and Term are selected, the Term must
       * belong to that Level.
       */
      if (levelId && term.level_id !== levelId) {
        return {
          success: false,
          error:
            "The selected term does not belong to the selected level.",
        };
      }
    }

    // --------------------------------------------------
    // --------------------------------------------------
    // 11. Validate Category
    // --------------------------------------------------

    let finalCategoryId = categoryId;

    if (!categoryId) {
      return {
        success: false,
        error: "Please select a notice category.",
      };
    }

    if (categoryId) {
      const { data: category, error } = await supabase
        .from("notice_categories")
        .select("id, name")
        .eq("id", categoryId)
        .single();

      if (error || !category) {
        return {
          success: false,
          error: "Selected notice category was not found.",
        };
      }

      if (category.name === "Others") {
        if (!customCategoryName) {
          return {
            success: false,
            error: "Please enter a custom category.",
          };
        }

        if (customCategoryName.length > 100) {
          return {
            success: false,
            error: "Custom category name is too long.",
          };
        }

        const { data: existingCustomCategory, error: existingCustomCategoryError } =
          await supabase
            .from("notice_categories")
            .select("id")
            .eq("is_custom", true)
            .ilike("name", customCategoryName)
            .maybeSingle();

        if (existingCustomCategoryError) {
          console.error(
            "Custom category lookup error:",
            existingCustomCategoryError,
          );

          return {
            success: false,
            error: "Custom category could not be verified.",
          };
        }

        if (existingCustomCategory) {
          finalCategoryId = existingCustomCategory.id;
        } else {
          const serviceSupabase = createServiceRoleClient();

          const { data: customCategory, error: customCategoryError } =
            await serviceSupabase
              .from("notice_categories")
              .insert({
                name: customCategoryName,
                is_custom: true,
                created_by: user.id,
              })
              .select("id")
              .single();

          if (customCategoryError || !customCategory) {
            console.error(
              "Custom category creation error:",
              customCategoryError,
            );

            return {
              success: false,
              error:
                customCategoryError?.message ??
                "Custom category could not be created.",
            };
          }

          finalCategoryId = customCategory.id;
        }
      } else if (customCategoryName) {
        return {
          success: false,
          error:
            "Custom category can only be used with the Others category.",
        };
      }
    } else if (customCategoryName) {
      return {
        success: false,
        error:
          "Please select Others before entering a custom category.",
      };
    }

    // 12. Insert notice
    // --------------------------------------------------

    const { data: notice, error: insertError } = await supabase
      .from("notices")
      .insert({
        title,
        content,
        category_id: finalCategoryId ?? undefined,

        target_scope: targetScope,

        target_department_id: departmentId,
        target_batch_id: batchId,
        target_level_id: levelId,
        target_term_id: termId,

        is_pinned: isPinned,
        pinned_by: isPinned ? user.id : null,
        is_archived: false,

        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !notice) {
      console.error(
        "Notice insert error:",
        insertError,
      );

      return {
        success: false,
        error:
          insertError?.message ??
          "Notice could not be published.",
      };
    }
    // --------------------------------------------------
    // 12A. Upload Notice Attachment + Save Metadata
    // --------------------------------------------------

    if (attachment) {
      const serviceSupabase = createServiceRoleClient();

      const safeFileName = attachment.name
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const filePath = `${notice.id}/${crypto.randomUUID()}-${safeFileName}`;

      const fileBuffer = Buffer.from(
        await attachment.arrayBuffer(),
      );

      const { error: uploadError } =
        await serviceSupabase.storage
          .from("notice-attachments")
          .upload(filePath, fileBuffer, {
            contentType: attachment.type,
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "Notice attachment upload error:",
          uploadError,
        );

        await serviceSupabase
          .from("notices")
          .delete()
          .eq("id", notice.id);

        return {
          success: false,
          error:
            "Notice attachment could not be uploaded. The notice was not published.",
        };
      }

      const { error: attachmentInsertError } =
        await serviceSupabase
          .from("notice_attachments")
          .insert({
            notice_id: notice.id,
            file_path: filePath,
            file_type: attachment.type,
            file_size_bytes: attachment.size,
          });

      if (attachmentInsertError) {
        console.error(
          "Notice attachment metadata error:",
          attachmentInsertError,
        );

        await serviceSupabase.storage
          .from("notice-attachments")
          .remove([filePath]);

        await serviceSupabase
          .from("notices")
          .delete()
          .eq("id", notice.id);

        return {
          success: false,
          error:
            "Notice attachment could not be saved. The notice was not published.",
        };
      }
    }

    // --------------------------------------------------
    // --------------------------------------------------
    // 13. Create Student Notifications
    // --------------------------------------------------

    const notificationService = createServiceRoleClient();

    let studentQuery = notificationService
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .eq("is_verified", true);

    if (departmentId) {
      studentQuery = studentQuery.eq(
        "department_id",
        departmentId,
      );
    }

    if (batchId) {
      studentQuery = studentQuery.eq(
        "batch_id",
        batchId,
      );
    }

    if (levelId) {
      studentQuery = studentQuery.eq(
        "current_level_id",
        levelId,
      );
    }

    if (termId) {
      studentQuery = studentQuery.eq(
        "current_term_id",
        termId,
      );
    }

    const {
      data: targetedStudents,
      error: targetedStudentsError,
    } = await studentQuery;

    if (targetedStudentsError) {
      console.error(
        "Targeted student lookup error:",
        targetedStudentsError,
      );

      const { data: attachmentRows } =
        await notificationService
          .from("notice_attachments")
          .select("file_path")
          .eq("notice_id", notice.id);

      if (attachmentRows && attachmentRows.length > 0) {
        await notificationService.storage
          .from("notice-attachments")
          .remove(
            attachmentRows.map((row) => row.file_path),
          );
      }

      await notificationService
        .from("notice_attachments")
        .delete()
        .eq("notice_id", notice.id);

      await notificationService
        .from("notices")
        .delete()
        .eq("id", notice.id);

      return {
        success: false,
        error:
          "Targeted students could not be determined. The notice was not published.",
      };
    }

    const recipientIds =
      targetedStudents?.map((student) => student.id) ?? [];

    const recipientEmails =
      targetedStudents?.map((student) => student.email).filter(Boolean) ?? [];

    if (recipientIds.length > 0) {
      const notificationRows = recipientIds.map(
        (recipientId) => ({
          recipient_id: recipientId,
          type: "notice",
          title,
          body: content,
          link_url: `/notices/${notice.id}`,
          is_read: false,
        }),
      );

      const { error: notificationInsertError } =
        await notificationService
          .from("notifications")
          .insert(notificationRows);

      if (notificationInsertError) {
        console.error(
          "Notification insert error:",
          notificationInsertError,
        );

        const { data: attachmentRows } =
          await notificationService
            .from("notice_attachments")
            .select("file_path")
            .eq("notice_id", notice.id);

        if (attachmentRows && attachmentRows.length > 0) {
          await notificationService.storage
            .from("notice-attachments")
            .remove(
              attachmentRows.map((row) => row.file_path),
            );
        }

        await notificationService
          .from("notice_attachments")
          .delete()
          .eq("notice_id", notice.id);

        await notificationService
          .from("notices")
          .delete()
          .eq("id", notice.id);

        return {
          success: false,
          error:
            "Student notifications could not be created. The notice was not published.",
        };
      }
    }

    // --------------------------------------------------
    // 13. Send Email Notifications
    // --------------------------------------------------

    if (recipientEmails.length > 0) {
      const emailFunctionUrl =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notice-email`;

      const emailSecret =
        process.env.NOTICE_EMAIL_SECRET;

      if (emailSecret) {
        try {
          const emailResponse = await fetch(emailFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-notice-email-secret": emailSecret,
            },
            body: JSON.stringify({
              noticeTitle: title,
              noticeContent: content,
              publisherName: profile.full_name,
              publisherRole: profile.role,
              publisherDepartment: publisherDepartmentName,
              noticeUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/notices/${notice.id}`,
              recipients: recipientEmails,
            }),
          });

          if (!emailResponse.ok) {
            console.error(
              "Notice email delivery error:",
              await emailResponse.text(),
            );
          }
        } catch (emailError) {
          console.error(
            "Notice email request error:",
            emailError,
          );
        }
      } else {
        console.error(
          "NOTICE_EMAIL_SECRET is not configured. Notice email was not sent.",
        );
      }
    }
    // 13. Refresh notice pages
    // --------------------------------------------------

    revalidatePath("/admin/notices");
    revalidatePath("/admin");

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/system-settings");

    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return {
      success: true,
      noticeId: notice.id,
    };
  } catch (error) {
    console.error(
      "Unexpected notice publishing error:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while publishing the notice.",
    };
  }
}





export async function toggleNoticePinForm(formData: FormData): Promise<void> {
  console.log("[toggleNoticePinForm] EXECUTED");
  const noticeId = String(formData.get("notice_id") ?? "").trim();

  if (!noticeId) {
    console.error("Notice pin error: notice_id is missing.");
    return;
  }

  const result = await toggleNoticePin(noticeId);

  if (!result.success) {
    console.error("Notice pin error:", result.error);
  }
}
export async function toggleNoticePin(
  noticeId: string,
): Promise<NoticeActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to pin or unpin a notice.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["admin", "super_admin"].includes(profile.role)
    ) {
      return {
        success: false,
        error: "You are not authorized to pin or unpin notices.",
      };
    }

    const { data: notice, error: noticeError } = await supabase
      .from("notices")
      .select("id, is_pinned")
      .eq("id", noticeId)
      .single();

    if (noticeError || !notice) {
      return {
        success: false,
        error: "Notice could not be found.",
      };
    }

    const nextPinnedState = !notice.is_pinned;

    const serviceSupabase = createServiceRoleClient();

    const { error: updateError } = await serviceSupabase
      .from("notices")
      .update({
        is_pinned: nextPinnedState,
        pinned_by: nextPinnedState ? user.id : null,
      })
      .eq("id", noticeId);

    if (updateError) {
      console.error("Notice pin update error:", updateError);

      return {
        success: false,
        error:
          updateError.message ??
          "Notice pin status could not be updated.",
      };
    }

    revalidatePath("/admin/notices");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return {
      success: true,
      noticeId,
    };
  } catch (error) {
    console.error("Unexpected notice pin error:", error);

    return {
      success: false,
      error:
        "An unexpected error occurred while updating the notice pin status.",
    };
  }
}
export async function deleteNoticeForm(formData: FormData): Promise<void> {
  const noticeId = String(formData.get("notice_id") ?? "").trim();

  if (!noticeId) {
    console.error("Notice delete error: notice_id is missing.");
    return;
  }

  const result = await deleteNotice(noticeId);

  if (!result.success) {
    console.error("Notice delete error:", result.error);
  }
}

export async function deleteNotice(
  noticeId: string,
): Promise<NoticeActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to delete a notice.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: "Your profile could not be verified.",
      };
    }

    if (profile.role === "admin") {
      const { data: deleteScope, error: deleteScopeError } = await supabase
        .from("staff_scopes")
        .select("id")
        .eq("profile_id", user.id)
        .eq("can_delete_notices", true)
        .limit(1)
        .maybeSingle();

      if (deleteScopeError || !deleteScope) {
        return {
          success: false,
          error: "You do not have permission to permanently delete notices.",
        };
      }
    } else if (profile.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to permanently delete notices.",
      };
    }
    const serviceSupabase = createServiceRoleClient();

    const { data: notice, error: noticeError } = await serviceSupabase
      .from("notices")
      .select("id")
      .eq("id", noticeId)
      .single();

    if (noticeError || !notice) {
      return {
        success: false,
        error: "Notice could not be found.",
      };
    }

    const { data: attachmentRows, error: attachmentLookupError } =
      await serviceSupabase
        .from("notice_attachments")
        .select("file_path")
        .eq("notice_id", noticeId);

    if (attachmentLookupError) {
      console.error(
        "Notice attachment lookup error:",
        attachmentLookupError,
      );

      return {
        success: false,
        error: "Notice attachments could not be prepared for deletion.",
      };
    }

    if (attachmentRows && attachmentRows.length > 0) {
      const { error: storageDeleteError } =
        await serviceSupabase.storage
          .from("notice-attachments")
          .remove(attachmentRows.map((row) => row.file_path));

      if (storageDeleteError) {
        console.error(
          "Notice attachment storage delete error:",
          storageDeleteError,
        );

        return {
          success: false,
          error: "Notice attachment files could not be deleted.",
        };
      }
    }

    const { error: deleteError } = await serviceSupabase
      .from("notices")
      .delete()
      .eq("id", noticeId);

    if (deleteError) {
      console.error("Notice permanent delete error:", deleteError);

      return {
        success: false,
        error: deleteError.message ?? "Notice could not be deleted.",
      };
    }

    revalidatePath("/admin/notices");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return {
      success: true,
      noticeId,
    };
  } catch (error) {
    console.error("Unexpected notice permanent delete error:", error);

    return {
      success: false,
      error: "An unexpected error occurred while deleting the notice.",
    };
  }
}




export type BulkNoticeDeleteResult =
  | {
      success: true;
      deletedCount: number;
    }
  | {
      success: false;
      error: string;
    };

export async function bulkDeleteNotices(
  fromDate: string,
  toDate: string,
): Promise<BulkNoticeDeleteResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to delete notices.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: "Your profile could not be verified.",
      };
    }

    if (profile.role === "admin") {
      const { data: deleteScope, error: deleteScopeError } = await supabase
        .from("staff_scopes")
        .select("id")
        .eq("profile_id", user.id)
        .eq("can_delete_notices", true)
        .limit(1)
        .maybeSingle();

      if (deleteScopeError || !deleteScope) {
        return {
          success: false,
          error: "You do not have permission to permanently delete notices.",
        };
      }
    } else if (profile.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to permanently delete notices.",
      };
    }

    if (!fromDate || !toDate || fromDate > toDate) {
      return {
        success: false,
        error: "Please provide a valid date range.",
      };
    }

    const serviceSupabase = createServiceRoleClient();

    const startDate = `${fromDate}T00:00:00`;
    const endDate = `${toDate}T23:59:59.999`;

    const { data: notices, error: noticesError } = await serviceSupabase
      .from("notices")
      .select("id")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (noticesError) {
      console.error("Bulk notice lookup error:", noticesError);

      return {
        success: false,
        error: "Notices could not be prepared for deletion.",
      };
    }

    if (!notices || notices.length === 0) {
      return {
        success: true,
        deletedCount: 0,
      };
    }

    const noticeIds = notices.map((notice) => notice.id);

    const { data: attachmentRows, error: attachmentLookupError } =
      await serviceSupabase
        .from("notice_attachments")
        .select("file_path")
        .in("notice_id", noticeIds);

    if (attachmentLookupError) {
      console.error(
        "Bulk notice attachment lookup error:",
        attachmentLookupError,
      );

      return {
        success: false,
        error: "Notice attachments could not be prepared for deletion.",
      };
    }

    if (attachmentRows && attachmentRows.length > 0) {
      const { error: storageDeleteError } = await serviceSupabase.storage
        .from("notice-attachments")
        .remove(attachmentRows.map((row) => row.file_path));

      if (storageDeleteError) {
        console.error(
          "Bulk notice attachment storage delete error:",
          storageDeleteError,
        );

        return {
          success: false,
          error: "Notice attachment files could not be deleted.",
        };
      }
    }

    const { error: deleteError } = await serviceSupabase
      .from("notices")
      .delete()
      .in("id", noticeIds);

    if (deleteError) {
      console.error("Bulk notice permanent delete error:", deleteError);

      return {
        success: false,
        error: deleteError.message ?? "Notices could not be deleted.",
      };
    }

    revalidatePath("/admin/notices");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return {
      success: true,
      deletedCount: noticeIds.length,
    };
  } catch (error) {
    console.error("Unexpected bulk notice delete error:", error);

    return {
      success: false,
      error: "An unexpected error occurred while deleting notices.",
    };
  }
}
export async function bulkDeleteNoticesForm(formData: FormData): Promise<BulkNoticeDeleteResult> { const fromDate = String(formData.get("from_date") ?? ""); const toDate = String(formData.get("to_date") ?? ""); return bulkDeleteNotices(fromDate, toDate); }
