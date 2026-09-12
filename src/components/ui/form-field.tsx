import * as React from "react";
import { Label } from "@/components/ui/label";

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

/**
 * Associates a Label with its input (via htmlFor/id) and renders an
 * optional validation error or hint underneath. Used by every field on
 * every Step 3 auth form for consistent spacing/typography.
 */
export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
