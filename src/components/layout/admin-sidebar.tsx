"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/material-icon";
import { getSystemOverview } from "@/lib/api/endpoints";
import type { CurrentUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { vi } from "@/messages/vi";
import { LogoutButton } from "./logout-button";

interface NavItem {
  href: string;
  label: string;
  /** Tên biểu tượng Material Symbols (theo Stitch). */
  icon: string;
  /** Đường dẫn khớp để tô sáng mục (mặc định là chính `href`). */
  match?: string;
  /** Chấm vàng "lô cần xử lý". */
  dot?: boolean;
}

const MAIN: NavItem[] = [
  { href: "/admin/dashboard", label: vi.adminNav.dashboard, icon: "dashboard" },
  { href: "/admin/item-bank", label: vi.adminNav.itemBank, icon: "database" },
  { href: "/admin/item-batches", label: vi.adminNav.itemBatches, icon: "layers", dot: true },
  { href: "/admin/exam-rounds", label: vi.adminNav.examRounds, icon: "calendar_month" },
  {
    href: "/admin/users/students",
    label: vi.adminNav.accounts,
    icon: "group",
    match: "/admin/users",
  },
];

// Báo cáo lớp và hồ sơ sinh viên: dùng chung thành phần với giảng viên (R-2) nhưng nằm trong khung Admin
const SHARED: NavItem[] = [
  { href: "/admin/reports", label: vi.adminNav.reports, icon: "bar_chart" },
  { href: "/admin/students", label: vi.adminNav.students, icon: "person_search" },
];

function isActive(pathname: string, item: NavItem): boolean {
  const base = item.match ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function NavLink({
  item,
  pathname,
  showDot,
}: {
  item: NavItem;
  pathname: string;
  showDot: boolean;
}) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[15px] leading-5 font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary-container text-primary-foreground shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
      )}
    >
      <span className="flex items-center gap-3">
        <MaterialIcon name={item.icon} size={20} />
        {item.label}
      </span>
      {showDot && (
        <span
          data-testid="batches-dot"
          title={vi.overview.statBatches}
          className="flex size-2 rounded-full bg-amber-500 ring-4 ring-amber-100"
        />
      )}
    </Link>
  );
}

/**
 * Thanh bên khu Admin (L-SIDEBAR, theo Stitch): cố định 240 px ở màn rộng; ở màn hẹp thu thành dải điều hướng cuộn ngang.
 * Chấm vàng cạnh "Lô câu hỏi" khi còn lô cần Admin xử lý (dùng chung cache với trang Tổng quan).
 */
export function AdminSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const overview = useQuery({
    queryKey: ["overview", null],
    queryFn: ({ signal }) => getSystemOverview(undefined, signal),
  });
  const hasBatches = (overview.data?.batchesNeedingAction ?? 0) > 0;

  return (
    <aside
      aria-label={vi.adminNav.label}
      className="z-50 flex flex-col justify-between border-b border-[#E2E8F0] bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] md:fixed md:top-0 md:left-0 md:h-full md:w-60 md:border-r md:border-b-0"
    >
      <div className="flex flex-col">
        <div className="flex h-16 items-center border-b border-[#E2E8F0] px-4">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary-container text-primary-foreground">
              <MaterialIcon name="check" size={20} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">{vi.common.appName}</span>
              <span className="block text-[11px] text-outline">{vi.common.tagline}</span>
            </span>
          </span>
        </div>
        <nav
          aria-label={vi.adminNav.label}
          className="flex gap-1 overflow-x-auto px-4 py-2 md:flex-col md:overflow-visible"
        >
          <p className="mb-1 hidden px-1 text-xs font-semibold tracking-wider text-outline uppercase md:block">
            {vi.adminNav.label}
          </p>
          {MAIN.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              showDot={Boolean(item.dot) && hasBatches}
            />
          ))}
          <div className="mx-1 my-2 hidden border-t border-[#E2E8F0] md:block" />
          {SHARED.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} showDot={false} />
          ))}
        </nav>
      </div>
      <div className="border-t border-[#E2E8F0] bg-surface-container-lowest p-4">
        <div className="mb-2 flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <MaterialIcon name="person" size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold" data-testid="user-name">
              {user.fullName}
            </span>
            <span className="mt-0.5 inline-flex w-fit items-center rounded bg-primary-fixed px-2 py-0.5 text-[11px] font-medium text-on-primary-fixed">
              {vi.adminNav.adminBadge}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-1">
          <Link
            href="/change-password"
            title={vi.adminNav.changePassword}
            className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <MaterialIcon name="key" size={16} />
            {vi.adminNav.changePassword}
          </Link>
          <LogoutButton variant="admin" />
        </div>
      </div>
    </aside>
  );
}
