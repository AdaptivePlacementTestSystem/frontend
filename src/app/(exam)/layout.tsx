import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";

/** Bố cục tập trung khi thi: KHÔNG có thanh điều hướng/đăng xuất để tránh rời bài giữa chừng. */
export default async function ExamLayout({ children }: { children: ReactNode }) {
  await requireUser("student");
  return <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>;
}
