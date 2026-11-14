"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  Database,
  LayoutDashboard,
  Layers,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getSystemOverview } from "@/lib/api/endpoints";
import type { CurrentUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { vi } from "@/messages/vi";
import { LogoutButton } from "./logout-button";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Đường dẫn khớp để tô sáng mục (mặc định là chính `href`). */
  match?: string;
  /** Chấm vàng "lô cần xử lý". */
  dot?: boolean;
}

const MAIN: NavItem[] = [
  { href: "/admin/dashboard", label: vi.adminNav.dashboard, icon: LayoutDashboard },
  { href: "/admin/item-bank", label: vi.adminNav.itemBank, icon: Database },
  { href: "/admin/item-batches", label: vi.adminNav.itemBatches, icon: Layers, dot: true },
  { href: "/admin/exam-rounds", label: vi.adminNav.examRounds, icon: CalendarDays },
  {
    href: "/admin/users/students",
    label: vi.adminNav.accounts,
    icon: Users,
    match: "/admin/users",
  },
];

// Admin xem báo cáo lớp và hồ sơ sinh viên ở màn dùng chung với giảng viên (R-2)
const SHARED: NavItem[] = [
  { href: "/teacher/reports", label: vi.adminNav.reports, icon: BarChart3 },
  { href: "/teacher/students", label: vi.adminNav.students, icon: UserSearch },
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
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-blue-100 text-blue-900"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="size-[18px]" aria-hidden />
        {item.label}
      </span>
      {showDot && (
        <span
          data-testid="batches-dot"
          title={vi.overview.statBatches}
          className="size-2 rounded-full bg-amber-500 ring-4 ring-amber-100"
        />
      )}
    </Link>
  );
}

/**
 * Thanh bên khu Admin (L-SIDEBAR): 240 px ở màn rộng; ở màn hẹp thu thành dải điều hướng cuộn ngang.
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
      className="flex shrink-0 flex-col justify-between border-b bg-background md:w-60 md:border-r md:border-b-0"
    >
      <div>
        <div className="flex h-16 items-center border-b px-4 font-semibold">
          {vi.common.appName}
        </div>
        <nav
          aria-label={vi.adminNav.label}
          className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible"
        >
          <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase md:block">
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
          <div className="mx-1 my-2 hidden border-t md:block" />
          {SHARED.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} showDot={false} />
          ))}
        </nav>
      </div>
      <div className="flex items-center justify-between gap-3 border-t p-4 md:flex-col md:items-stretch">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {user.fullName.trim().charAt(0).toUpperCase() || "A"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" data-testid="user-name">
              {user.fullName}
            </p>
            <Badge variant="secondary">{vi.adminNav.adminBadge}</Badge>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
