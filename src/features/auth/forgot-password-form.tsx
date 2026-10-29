"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CircleAlert, Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bffRequest } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/error-message";
import { vi } from "@/messages/vi";
import { authInputClass } from "./auth-styles";
import { emailSchema } from "./password-schema";
import { useCooldown } from "./use-cooldown";

const RESEND_LOCK_SECONDS = 30;

const schema = z.object({ email: emailSchema });
type Values = z.infer<typeof schema>;

/** S17 — Quên mật khẩu. Luôn hiện thông điệp trung tính y hệt dù email có tồn tại hay không (BR-14). */
export function ForgotPasswordForm() {
  const t = vi.auth.forgot;
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const cooldown = useCooldown();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const email = useWatch({ control, name: "email" });
  const locked = cooldown.left > 0;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await bffRequest("/api/auth/forgot-password", { method: "POST", body: values });
      setSentTo(values.email);
      cooldown.start(RESEND_LOCK_SECONDS);
    } catch (e) {
      setServerError(errorMessage(e));
    }
  });

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" data-testid="fp-form">
        <div className="space-y-1.5">
          <Label htmlFor="fp-email" className="text-[15px] font-medium">
            {t.email} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fp-email"
            type="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "fp-email-error" : undefined}
            data-testid="fp-email"
            className={authInputClass}
            {...register("email")}
          />
          {errors.email && (
            <p id="fp-email-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {serverError && (
          <div
            role="alert"
            data-testid="fp-error"
            className="flex items-start gap-2.5 rounded-lg bg-[#ffdad6] p-3 text-[13px] font-medium text-[#93000a]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <span>{serverError}</span>
          </div>
        )}

        {sentTo && (
          <div
            role="status"
            data-testid="fp-sent"
            className="flex items-start gap-2.5 rounded-lg bg-[var(--auth-soft)] p-3 text-[13px] leading-relaxed text-foreground"
          >
            <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{t.sent}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || locked || !email.trim()}
          data-testid="fp-submit"
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> {t.submitting}
            </>
          ) : locked ? (
            t.resendIn(cooldown.left)
          ) : (
            t.submit
          )}
        </Button>

        {sentTo && (
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            <Link
              href={`/reset-password?email=${encodeURIComponent(sentTo)}`}
              data-testid="fp-enter-code"
            >
              {t.enterCode}
            </Link>
          </Button>
        )}
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          data-testid="fp-back"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[15px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {vi.auth.backToLogin}
        </Link>
      </div>
    </>
  );
}
