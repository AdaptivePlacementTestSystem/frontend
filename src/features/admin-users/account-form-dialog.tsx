"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import type {
  AccountKind,
  AdminAccount,
  CreateAccountBody,
  UpdateAccountBody,
} from "@/lib/api/types";
import { vi } from "@/messages/vi";

const t = vi.accounts;

const baseShape = {
  fullName: z.string().trim().min(1, t.required),
  email: z.string().trim().min(1, t.required).pipe(z.email(t.invalidEmail)),
};
const createSchema = z.object({ code: z.string().trim().min(1, t.required), ...baseShape });
const editSchema = z.object({ code: z.string(), ...baseShape });

type Values = { code: string; fullName: string; email: string };

interface Props {
  kind: AccountKind;
  /** Có `account` ⇒ sửa (MSSV/mã GV chỉ đọc); không có ⇒ tạo mới. */
  account?: AdminAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (body: CreateAccountBody) => Promise<unknown>;
  onUpdate: (id: string, body: UpdateAccountBody) => Promise<unknown>;
}

/** Hộp thoại tạo/sửa tài khoản SV hoặc GV (S24, modal ≤ 480 px). Trùng email/MSSV/mã GV ⇒ lỗi ngay dưới đúng ô. */
export function AccountFormDialog({ open, onOpenChange, ...rest }: Props) {
  const title = rest.account
    ? t.formEdit
    : rest.kind === "STUDENT"
      ? t.formCreateStudent
      : t.formCreateTeacher;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="account-form">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {/* Gắn mới mỗi lần mở (key) để biểu mẫu luôn bắt đầu từ giá trị của tài khoản được chọn. */}
        {open && (
          <FormBody key={rest.account?.id ?? "new"} {...rest} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  kind,
  account,
  onCreate,
  onUpdate,
  onClose,
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const editing = Boolean(account);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: {
      code: account ? (account.studentCode ?? account.teacherCode ?? "") : "",
      fullName: account?.fullName ?? "",
      email: account?.email ?? "",
    },
  });

  const codeLabel = kind === "STUDENT" ? t.fieldStudentCode : t.fieldTeacherCode;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (account) {
        await onUpdate(account.id, { fullName: values.fullName, email: values.email });
      } else {
        await onCreate({
          ...(kind === "STUDENT" ? { studentCode: values.code } : { teacherCode: values.code }),
          fullName: values.fullName,
          email: values.email,
        });
      }
      onClose();
    } catch (e) {
      const field =
        e instanceof ApiError && e.code === "CONFLICT"
          ? (e.details as { field?: string } | undefined)?.field
          : undefined;
      if (field === "email") setError("email", { message: t.dupEmail });
      else if (field === "studentCode" || field === "teacherCode") {
        setError("code", {
          message: field === "studentCode" ? t.dupStudentCode : t.dupTeacherCode,
        });
      } else {
        setServerError(errorMessage(e));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="account-code">
          {codeLabel} <span aria-hidden>*</span>
        </Label>
        <Input
          id="account-code"
          data-testid="account-code"
          disabled={editing}
          aria-invalid={Boolean(errors.code)}
          {...register("code")}
        />
        {errors.code && (
          <p role="alert" className="text-sm text-destructive" data-testid="error-code">
            {errors.code.message}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="account-name">
          {t.fieldFullName} <span aria-hidden>*</span>
        </Label>
        <Input
          id="account-name"
          data-testid="account-name"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p role="alert" className="text-sm text-destructive" data-testid="error-name">
            {errors.fullName.message}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="account-email">
          {t.fieldEmail} <span aria-hidden>*</span>
        </Label>
        <Input
          id="account-email"
          type="email"
          data-testid="account-email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className="text-sm text-destructive" data-testid="error-email">
            {errors.email.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive" data-testid="form-error">
          {serverError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {vi.common.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting} data-testid="account-save">
          {isSubmitting ? t.saving : vi.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}
