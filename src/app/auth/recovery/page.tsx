"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";

function RecoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createRecoveryClient();

    const nextParam = searchParams.get("next");
    const next =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/reset-password";

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace(next);
      }
    });

    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        router.replace(next);
      }
    };

    void checkSession();

    return () => {
      data.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">
          Verifying password reset link...
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait.
        </p>
      </div>
    </main>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-xl font-semibold">
              Verifying password reset link...
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait.
            </p>
          </div>
        </main>
      }
    >
      <RecoveryContent />
    </Suspense>
  );
}
