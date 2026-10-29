import type { Metadata } from "next";
import { AuthCardShell } from "@/features/auth/auth-card-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Đặt lại mật khẩu · Adaptive Placement Test" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const email = (await searchParams).email;
  return (
    <AuthCardShell>
      <ResetPasswordForm email={typeof email === "string" ? email : undefined} />
    </AuthCardShell>
  );
}
