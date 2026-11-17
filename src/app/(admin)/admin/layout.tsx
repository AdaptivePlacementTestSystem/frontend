import { Be_Vietnam_Pro } from "next/font/google";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminThemeScope } from "@/components/layout/admin-theme-scope";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import { requireUser } from "@/lib/auth/session";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
});

/** Khu Admin (S19–S36): chỉ ADMIN (BR-16); bố cục theo Stitch: thanh bên 240 px + thanh trên 64 px. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("admin");
  return (
    <div
      className={`${beVietnam.variable} admin-theme min-h-screen flex-1 bg-surface text-on-surface`}
    >
      <AdminThemeScope fontClass={beVietnam.variable} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- biểu tượng Material Symbols của Stitch */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
      />
      <AdminSidebar user={user} />
      <div className="md:pl-60">
        <AdminTopbar />
        <main className="px-4 py-6 md:px-8 md:py-8 md:pt-24">{children}</main>
      </div>
    </div>
  );
}
