import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Minimal text input primitive matching the design tokens defined in
 * globals.css (Phase A). Plain, uncontrolled by default — the auth
 * pages read values via FormData on submit, not React state.
 */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={[
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
