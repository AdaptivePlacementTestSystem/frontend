"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bffRequest } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/error-message";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { vi } from "@/messages/vi";
import { authInputClass } from "./auth-styles";
import { PasswordField } from "./password-field";
import { emailSchema, newPasswordSchema } from "./password-schema";

const OTP_LENGTH = 6;

const schema = z
  .object({
    email: emailSchema,
    otp: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), vi.auth.reset.otpInvalid),
    newPassword: newPasswordSchema,
    confirm: z.string().min(1, vi.auth.required),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ["confirm"],
    message: vi.auth.confirmMismatch,
  });
type Values = z.infer<typeof schema>;

/** S18 — Đặt lại mật khẩu bằng OTP 6 số. Thành công ⇒ về /login, KHÔNG tự đăng nhập. */
export function ResetPasswordForm({ email: initialEmail }: { email?: string }) {
  const t = vi.auth.reset;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail ?? "", otp: "", newPassword: "", confirm: "" },
  });

  const [email, otp, newPassword, confirm] = useWatch({
    control,
    name: ["email", "otp", "newPassword", "confirm"],
  });
  const ready =
    !!email.trim() &&
    otp.length === OTP_LENGTH &&
    newPassword.length >= PASSWORD_MIN_LENGTH &&
    confirm === newPassword;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await bffRequest("/api/auth/reset-password", {
        method: "POST",
        body: { email: values.email, otp: values.otp, newPassword: values.newPassword },
      });
      toast.success(t.success);
      router.replace("/login");
    } catch (e) {
      setServerError(errorMessage(e));
      resetField("otp"); // OTP dùng một lần, sai quá 5 lần bị hủy (BR-14)
      setFocus("otp");
    }
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{t.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="rp-form">
        <div className="space-y-1.5">
          <Label htmlFor="rp-email" className="text-[15px] font-medium">
            {t.email} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rp-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            data-testid="rp-email"
            className={authInputClass}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rp-otp" className="text-[15px] font-medium">
            {t.otp} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rp-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            placeholder="••••••"
            aria-invalid={!!errors.otp}
            data-testid="rp-otp"
            className={`${authInputClass} h-14 text-center text-xl font-bold tracking-[0.6em] text-primary`}
            {...register("otp", {
              // Tự bỏ ký tự không phải số
              onChange: (e) =>
                setValue("otp", e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH)),
            })}
          />
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden /> {t.otpValidity}
            </span>
            <span
              className={otp.length === OTP_LENGTH ? "font-medium text-secondary-foreground" : ""}
            >
              {otp.length === OTP_LENGTH ? t.otpComplete : t.otpMissing(OTP_LENGTH - otp.length)}
            </span>
          </div>
          {errors.otp && (
            <p role="alert" className="text-sm text-destructive">
              {errors.otp.message}
            </p>
          )}
        </div>

        <PasswordField
          id="rp-new"
          label={t.newPassword}
          autoComplete="new-password"
          error={errors.newPassword?.message}
          hint={vi.auth.passwordHint(PASSWORD_MIN_LENGTH)}
          data-testid="rp-new"
          {...register("newPassword")}
        />
        <PasswordField
          id="rp-confirm"
          label={t.confirm}
          autoComplete="new-password"
          error={errors.confirm?.message}
          data-testid="rp-confirm"
          {...register("confirm")}
        />

        {serverError && (
          <div
            role="alert"
            data-testid="rp-error"
            className="flex items-start gap-2.5 rounded-lg bg-[#ffdad6] p-3 text-[13px] font-medium text-[#93000a]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !ready}
          data-testid="rp-submit"
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> {t.submitting}
            </>
          ) : (
            <>
              <CheckCircle2 aria-hidden /> {t.submit}
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 border-t pt-4 text-center">
        <p className="text-[15px] text-muted-foreground">
          {t.noCode}{" "}
          <Link
            href="/forgot-password"
            data-testid="rp-resend"
            className="font-semibold text-primary underline underline-offset-4"
          >
            {t.resend}
          </Link>
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {vi.auth.backToLogin}
        </Link>
      </div>
    </>
  );
}
