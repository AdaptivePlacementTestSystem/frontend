import type { Metadata } from "next";
import { AuthCardShell } from "@/features/auth/auth-card-shell";
import { ChangePasswordForm } from "@/features/auth/change-password-form";

export const metadata: Metadata = { title: "Đổi mật khẩu · Adaptive Placement Test" };

export default async function ChangePasswordPage({ searchParams }: PageProps<"/change-password">) {
  // ?first=1: vào do mustChangePassword. Chỉ ảnh hưởng giao diện (ẩn "Hủy"); backend mới là nơi chặn thật (403 PASSWORD_CHANGE_REQUIRED).
  const first = (await searchParams).first;
  return (
    <AuthCardShell>
      <ChangePasswordForm forced={first === "1"} />
    </AuthCardShell>
  );
}
