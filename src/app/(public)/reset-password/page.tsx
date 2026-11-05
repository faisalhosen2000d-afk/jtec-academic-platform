"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const supabase = createRecoveryClient();

    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setError(
          "This password reset link is invalid or has expired. Please request a new reset link."
        );
        setReady(true);
        return;
      }

      setReady(true);
    };

    void checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setPasswordError("");
    setConfirmPasswordError("");
    setError("");
    setIsPending(true);

    const result = resetPasswordSchema.safeParse({
      password,
      confirm_password: confirmPassword,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];

        if (field === "password") {
          setPasswordError(issue.message);
        }

        if (field === "confirm_password") {
          setConfirmPasswordError(issue.message);
        }
      }

      setIsPending(false);
      return;
    }

    try {
      const supabase = createRecoveryClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: result.data.password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();
      setSuccess(true);

      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Reset Password
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            marginBottom: "28px",
          }}
        >
          Enter your new password below.
        </p>

        {!ready ? (
          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Verifying password reset session...
          </p>
        ) : success ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                padding: "14px",
                borderRadius: "8px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#047857",
                fontSize: "14px",
                lineHeight: "1.5",
                marginBottom: "16px",
              }}
            >
              Your password has been updated successfully. Redirecting to login page...
            </div>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                width: "100%",
                padding: "12px",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Go to Login Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
                }}
              >
                New Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${
                    passwordError ? "#ef4444" : "#cbd5e1"
                  }`,
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />

              {passwordError ? (
                <p
                  style={{
                    marginTop: "6px",
                    color: "#dc2626",
                    fontSize: "14px",
                  }}
                >
                  {passwordError}
                </p>
              ) : null}
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="confirm_password"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
                }}
              >
                Confirm new password
              </label>

              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${
                    confirmPasswordError ? "#ef4444" : "#cbd5e1"
                  }`,
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />

              {confirmPasswordError ? (
                <p
                  style={{
                    marginTop: "6px",
                    color: "#dc2626",
                    fontSize: "14px",
                  }}
                >
                  {confirmPasswordError}
                </p>
              ) : null}
            </div>

            {error && !passwordError && !confirmPasswordError ? (
              <p
                role="alert"
                style={{
                  marginBottom: "18px",
                  color: "#dc2626",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%",
                padding: "12px",
                background: isPending ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Updating password..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}