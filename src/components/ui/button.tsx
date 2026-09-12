import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
};

/**
 * Minimal button primitive. Only the variants actually used by the
 * Step 3 auth pages are implemented (primary submit buttons, an
 * outline sign-out button). Extend when a later phase needs more.
 */
export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      ].join(" ")}
      disabled={disabled}
      {...props}
    />
  );
}
