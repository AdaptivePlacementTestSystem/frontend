"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/logout-button";
import { bffRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { vi } from "@/messages/vi";
import { PasswordField } from "./password-field";
import { newPasswordSchema } from "./password-schema";

const schema = z
  .object({
    currentPassword: z.string().min(1, vi.auth.required),
    newPassword: newPasswordSchema,
    confirm: z.string().min(1, vi.auth.required),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: vi.auth.sameAsCurrent,
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ["confirm"],
    message: vi.auth.confirmMismatch,
  });
type Values = z.infer<typeof schema>;

/**
 * S16 — Đổi mật khẩu, dùng chung 3 role. `forced` = vào do mustChangePassword (BR-05): không có nút Hủy,
 * chỉ có thể Đăng xuất; đổi tự nguyện thì có nút Hủy.
 */
export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const t = vi.auth.change;
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
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const [current, next, confirm] = useWatch({
    control,
    name: ["currentPassword", "newPassword", "confirm"],
  });
  const ready = !!current && next.length >= PASSWORD_MIN_LENGTH && confirm === next;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await bffRequest("/api/auth/change-password", {
        method: "POST",
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      toast.success(t.success);
      // "/" được proxy.ts chuyển về trang chủ đúng role; token đã được cấp lại (mustChangePassword=false)
      router.replace("/");
      router.refresh();
    } catch (e) {
      setServerError(errorMessage(e));
      if (e instanceof ApiError && e.code === "CURRENT_PASSWORD_INVALID") {
        resetField("currentPassword");
        setFocus("currentPassword");
      }
    }
  });

  return (
    <>
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        {forced && (
          <p
            data-testid="cp-first-login-note"
            className="mt-1.5 text-[15px] leading-6 text-muted-foreground"
          >
            {t.firstLogin}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="cp-form">
        <PasswordField
          id="cp-current"
          label={t.current}
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          data-testid="cp-current"
          {...register("currentPassword")}
        />
        <PasswordField
          id="cp-new"
          label={t.newPassword}
          autoComplete="new-password"
          placeholder={t.newPlaceholder(PASSWORD_MIN_LENGTH)}
          error={errors.newPassword?.message}
          hint={vi.auth.passwordHint(PASSWORD_MIN_LENGTH)}
          data-testid="cp-new"
          {...register("newPassword")}
        />
        <PasswordField
          id="cp-confirm"
          label={t.confirm}
          autoComplete="new-password"
          placeholder={t.confirmPlaceholder}
          error={errors.confirm?.message}
          data-testid="cp-confirm"
          {...register("confirm")}
        />

        {serverError && (
          <div
            role="alert"
            data-testid="cp-error"
            className="flex items-start gap-2.5 rounded-lg bg-[#ffdad6] p-3 text-[13px] font-medium text-[#93000a]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !ready}
          data-testid="cp-submit"
          className="mt-1 h-12 w-full rounded-xl text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> {t.submitting}
            </>
          ) : (
            <>
              <Save aria-hidden /> {t.submit}
            </>
          )}
        </Button>

        {forced ? (
          <div className="flex justify-center">
            <LogoutButton />
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            data-testid="cp-cancel"
            onClick={() => router.back()}
            className="h-10 w-full rounded-xl"
          >
            {t.cancel}
          </Button>
        )}
      </form>
    </>
  );
}
