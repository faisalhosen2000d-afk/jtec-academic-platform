"use client";

import { useState, type ChangeEvent } from "react";
import { Eye, EyeOff, Check, Circle } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";

export type PasswordInputProps = Omit<InputProps, "type"> & {
  showStrength?: boolean;
};

export function PasswordInput({
  className,
  disabled,
  showStrength = false,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const [internalPassword, setInternalPassword] = useState(
  typeof props.defaultValue === "string" ? props.defaultValue : ""
);

const password =
  typeof props.value === "string" ? props.value : internalPassword;

const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
  setInternalPassword(event.target.value);
  props.onChange?.(event);
};

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const requirements = [
    { label: "8 Chars", met: hasMinLength },
    { label: "A-Z", met: hasUppercase },
    { label: "a-z", met: hasLowercase },
    { label: "123", met: hasNumber },
    { label: "@#$", met: hasSpecial },
  ];

  const score = requirements.filter((item) => item.met).length;

  const strength =
    score <= 1 ? "Weak" : score <= 3 ? "Medium" : "Strong";

  const strengthWidth =
    score === 0 ? "0%" : `${(score / 5) * 100}%`;

  return (
    <div>
      <div className="relative">
        <Input
          {...props}
          disabled={disabled}
          onChange={handlePasswordChange}
          type={visible ? "text" : "password"}
          className={`pr-10 ${className ?? ""}`}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {showStrength && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Password Strength</span>
            <span className="font-medium text-gray-700">
              {password ? strength : "—"}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: strengthWidth }}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5">
            {requirements.map((requirement) => (
              <div
                key={requirement.label}
                className={`flex items-center gap-1 ${
                  requirement.met
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {requirement.met ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                <span>{requirement.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}