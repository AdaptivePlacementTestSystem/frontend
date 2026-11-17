import type { Metadata } from "next";
import { AuthCardShell } from "@/features/auth/auth-card-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Quên mật khẩu · Adaptive Placement Test" };

export default function ForgotPasswordPage() {
  return (
    <AuthCardShell>
      <ForgotPasswordForm />
    </AuthCardShell>
  );
}
