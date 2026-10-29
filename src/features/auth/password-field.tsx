"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vi } from "@/messages/vi";
import { authInputClass } from "./auth-styles";

type Props = Omit<ComponentProps<"input">, "type"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
};

/** Ô mật khẩu có nút Hiện/Ẩn (C-PASSWORD). Dùng được với `register()` của react-hook-form. */
export function PasswordField({ id, label, error, hint, className, ...props }: Props) {
  const [shown, setShown] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[15px] font-medium">
        {label} <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(authInputClass, "pr-14", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={vi.auth.togglePassword}
          aria-pressed={shown}
          onClick={() => setShown((v) => !v)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-1.5 py-1 text-xs font-semibold text-primary hover:bg-[var(--auth-soft)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {shown ? vi.auth.hide : vi.auth.show}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
