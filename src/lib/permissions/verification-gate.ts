export type VerificationStatusType = "pending" | "approved" | "rejected" | "suspended";

export const EXPLICIT_ALLOWED_STUDENT_ROUTES = ["/dashboard", "/profile"];

export function isRouteAllowedForPendingStudent(pathname: string): boolean {
  return EXPLICIT_ALLOWED_STUDENT_ROUTES.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

export function isStudentVerified(profile?: {
  is_verified?: boolean | null;
  verification_status?: string | null;
  role?: string | null;
} | null): boolean {
  if (!profile) return false;

  if (
    profile.role &&
    ["admin", "super_admin", "moderator"].includes(profile.role)
  ) {
    return true;
  }

  const status = profile.verification_status?.toLowerCase().trim();
  if (status === "suspended" || status === "rejected") {
    return false;
  }

  return profile.is_verified === true || status === "approved";
}
