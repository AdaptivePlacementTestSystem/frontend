import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { requireUser } from "@/lib/auth/session";

/** Khu Admin (S19–S36): chỉ ADMIN (BR-16), bố cục thanh bên L-SIDEBAR. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("admin");
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <AdminSidebar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
