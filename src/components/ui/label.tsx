import * as React from "react";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      className={["mb-1.5 block text-sm font-medium text-foreground", className].join(" ")}
      {...props}
    />
  );
}
