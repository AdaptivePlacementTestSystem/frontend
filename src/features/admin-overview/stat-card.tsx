import Link from "next/link";
import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";
import { formatCount } from "./overview-math";

interface Props {
  testId: string;
  label: string;
  value: number;
  /** Chú thích nhỏ dưới số lớn. */
  note?: string;
  /** Huy hiệu cạnh số lớn (ví dụ "Cần xử lý"). */
  badge?: ReactNode;
  /** Liên kết dưới thẻ (thẻ trở thành lối tắt tới màn quản lý tương ứng). */
  link?: { href: string; label: string };
  /** Tên biểu tượng Material Symbols ở góc phải trên. */
  icon: string;
  /** Tông của ô biểu tượng. */
  tone?: "primary" | "amber" | "teal";
}

const ICON_TONE = {
  primary: "bg-surface-container-low text-primary",
  amber: "bg-amber-50 text-amber-600",
  teal: "bg-surface-container-low text-teal",
} as const;

/** Thẻ số liệu lớn của S36 (đúng kiểu Stitch): nhãn hoa nhỏ, ô biểu tượng, số lớn 32 px, chú thích hoặc liên kết. */
export function StatCard({
  testId,
  label,
  value,
  note,
  badge,
  link,
  icon,
  tone = "primary",
}: Props) {
  return (
    <div
      data-testid={testId}
      className="group relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="pointer-events-none absolute -right-4 -bottom-4 size-24 rounded-full bg-surface-container-low transition-transform group-hover:scale-125" />
      <div className="relative mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-outline uppercase">{label}</span>
        <span className={cn("flex size-9 items-center justify-center rounded-lg", ICON_TONE[tone])}>
          <MaterialIcon name={icon} size={20} />
        </span>
      </div>
      <div className="relative">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[32px] leading-10 font-bold tracking-tight text-on-surface"
            data-testid={`${testId}-value`}
          >
            {formatCount(value)}
          </span>
          {badge}
        </div>
        {note && <p className="mt-2 line-clamp-1 text-[13px] text-on-surface-variant">{note}</p>}
        {link && (
          <Link
            href={link.href}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition-transform hover:text-primary-container group-hover:translate-x-0.5"
          >
            {link.label}
            <MaterialIcon name="arrow_forward" size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
