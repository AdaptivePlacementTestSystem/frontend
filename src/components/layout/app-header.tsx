import Link from "next/link";
import type { CurrentUser } from "@/lib/api/types";
import { vi } from "@/messages/vi";
import { LogoutButton } from "./logout-button";

export interface NavLink {
  href: string;
  label: string;
}

/** Thanh đầu trang dùng chung. Trang làm bài KHÔNG dùng (focus layout, không có điều hướng). */
export function AppHeader({ user, links }: { user: CurrentUser; links: NavLink[] }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold">{vi.common.appName}</span>
        <nav aria-label="Điều hướng chính" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span data-testid="user-name">
            {user.fullName} · {vi.userRole[user.role]}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
