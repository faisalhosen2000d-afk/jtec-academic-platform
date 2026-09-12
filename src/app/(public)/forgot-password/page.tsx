"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";
import {
  type AuthActionResult,
} from "@/server/actions/auth";

const initialState: AuthActionResult = {
  success: false,
  error: "",
};

export default function ForgotPasswordPage() {
  const [state, setState] = useState<AuthActionResult>(initialState);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    setIsPending(true);

    const supabase = createRecoveryClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/recovery?next=/reset-password`,
    });

    if (error) {
      setState({
        success: false,
        error: error.message,
      });
    } else {
      setState({
        success: true,
      });
    }

    setIsPending(false);
  };

  const fieldError =
    state.success ? undefined : state.fieldErrors?.email?.[0];

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
          Forgot Password
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            marginBottom: "28px",
          }}
        >
          Enter your email address and we&apos;ll send you a password
          reset link.
        </p>

        {state.success ? (
          <div
            style={{
              padding: "14px",
              borderRadius: "8px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            If an account exists with that email address, a password reset
            link has been sent. Please check your email.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
                }}
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                autoComplete="email"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${
                    fieldError ? "#ef4444" : "#cbd5e1"
                  }`,
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />

              {fieldError ? (
                <p
                  style={{
                    marginTop: "6px",
                    color: "#dc2626",
                    fontSize: "14px",
                  }}
                >
                  {fieldError}
                </p>
              ) : null}
            </div>

            {state.error && !fieldError ? (
              <p
                role="alert"
                style={{
                  marginBottom: "18px",
                  color: "#dc2626",
                  fontSize: "14px",
                }}
              >
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                background: isPending ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          <Link
            href="/login"
            style={{
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}


