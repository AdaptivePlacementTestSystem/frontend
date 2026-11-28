import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { requireUser } from "@/lib/auth/session";
import { vi } from "@/messages/vi";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("staff");
  const links = [
    ...(user.role === "TEACHER" ? [{ href: "/teacher/tasks/reviews", label: "Hộp việc" }] : []),
    { href: "/teacher/items", label: vi.nav.items },
    { href: "/teacher/reports", label: vi.nav.reports },
    { href: "/teacher/students", label: vi.nav.students },
  ];
  return (
    <>
      <AppHeader user={user} links={links} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
