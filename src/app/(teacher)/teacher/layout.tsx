import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { requireUser } from "@/lib/auth/session";
import { vi } from "@/messages/vi";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("staff");
  return (
    <>
      <AppHeader
        user={user}
        links={[
          { href: "/teacher/items", label: vi.nav.items },
          { href: "/teacher/review-queue", label: vi.nav.reviewQueue },
          { href: "/teacher/reports", label: vi.nav.reports },
          { href: "/teacher/students", label: vi.nav.students },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
