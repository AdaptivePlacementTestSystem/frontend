import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { vi } from "@/messages/vi";
import { AppHeader } from "@/components/layout/app-header";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("student");
  const links = isStaff(user.role)
    ? [
        { href: "/teacher/items", label: vi.nav.items },
        { href: "/teacher/review-queue", label: vi.nav.reviewQueue },
        { href: "/teacher/reports", label: vi.nav.reports },
        { href: "/teacher/students", label: vi.nav.students },
      ]
    : [
        { href: "/", label: vi.nav.home },
        { href: "/history", label: vi.nav.history },
      ];

  return (
    <>
      <AppHeader user={user} links={links} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </>
  );
}
