import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every request.
 *
 * IMPORTANT: this middleware is a UX convenience layer only (keeping
 * sessions alive, and — once Phase D/E lands — coarse route-group
 * redirects for unauthenticated users). It is explicitly NOT the
 * authorization boundary. Per the approved security architecture,
 * real enforcement happens via server-side permission checks + RLS +
 * Storage policies. Route-group protection (student/staff redirects)
 * is implemented in Phase D (Authentication) and Phase E
 * (Role/permission system) — intentionally left out of Phase A.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touches the session so expired tokens are refreshed before any
  // Server Component/Action runs. No redirect logic yet — Phase D/E.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
