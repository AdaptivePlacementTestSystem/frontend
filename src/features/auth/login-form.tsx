"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bffRequest } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/error-message";
import type { CurrentUser } from "@/lib/api/types";
import { homeFor } from "@/lib/auth/roles";
import { vi } from "@/messages/vi";
import { authInputClass } from "./auth-styles";
import { PasswordField } from "./password-field";

const schema = z.object({
  email: z.string().trim().min(1, vi.login.required).pipe(z.email(vi.login.emailInvalid)),
  password: z.string().min(1, vi.login.required),
});
type Values = z.infer<typeof schema>;

/** Chỉ cho phép quay lại đường dẫn nội bộ (chống open-redirect). */
export function safeNext(next: string | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const [email, password] = useWatch({ control, name: ["email", "password"] });
  const empty = !email.trim() || !password;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { user, mustChangePassword } = await bffRequest<{
        user: CurrentUser;
        mustChangePassword: boolean;
      }>("/api/auth/login", { method: "POST", body: values });
      // Mật khẩu tạm (BR-05): bắt buộc đổi trước khi vào bất cứ đâu
      router.replace(
        mustChangePassword ? "/change-password?first=1" : (safeNext(next) ?? homeFor(user.role)),
      );
      router.refresh();
    } catch (e) {
      setServerError(errorMessage(e));
      resetField("password"); // giữ nguyên Email, xóa Mật khẩu, đưa con trỏ về ô Mật khẩu
      setFocus("password");
    }
  });

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{vi.login.title}</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{vi.login.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="login-form">
        <div className="space-y-1.5">
          <Label htmlFor="login-id" className="text-[15px] font-medium">
            {vi.login.email} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-id"
            type="email"
            autoComplete="username"
            placeholder={vi.login.emailPlaceholder}
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-id-error" : undefined}
            data-testid="login-id"
            className={authInputClass}
            {...register("email")}
          />
          {errors.email && (
            <p id="login-id-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <PasswordField
            id="login-password"
            label={vi.login.password}
            autoComplete="current-password"
            placeholder={vi.login.passwordPlaceholder}
            disabled={isSubmitting}
            error={errors.password?.message}
            data-testid="login-password"
            {...register("password")}
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              data-testid="forgot-password-link"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {vi.login.forgot}
            </Link>
          </div>
        </div>

        {serverError && (
          <div
            role="alert"
            data-testid="login-error"
            className="flex items-start gap-2.5 rounded-lg bg-[#ffdad6] p-3 text-[13px] font-medium text-[#93000a]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || empty}
          data-testid="login-submit"
          className="mt-1 h-12 w-full rounded-xl text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> {vi.login.submitting}
            </>
          ) : (
            <>
              {vi.login.submit} <ArrowRight aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
