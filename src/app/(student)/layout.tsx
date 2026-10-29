import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { vi } from "@/messages/vi";
import { AppHeader } from "@/components/layout/app-header";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("student");
  return (
    <>
      <AppHeader
        user={user}
        links={[
          { href: "/", label: vi.nav.home },
          { href: "/history", label: vi.nav.history },
        ]}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </>
  );
}
