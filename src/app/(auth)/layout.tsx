import type { ReactNode } from "react";
import { AuthTheme } from "@/features/auth/auth-theme";

/** Chung cho S01, S16–S18: font + bảng màu xanh. Bố cục từng màn do trang tự dựng (S01 hai nửa, S16–S18 thẻ 420 px). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthTheme className="flex flex-1 flex-col">{children}</AuthTheme>;
}
