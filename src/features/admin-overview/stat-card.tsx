import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
}

/** Thẻ số liệu lớn của S36: nhãn xám nhỏ, số lớn, chú thích hoặc liên kết. */
export function StatCard({ testId, label, value, note, badge, link }: Props) {
  return (
    <Card data-testid={testId}>
      <CardContent className="space-y-2 pt-4">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight" data-testid={`${testId}-value`}>
            {formatCount(value)}
          </span>
          {badge}
        </div>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {link && (
          <Link
            href={link.href}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {link.label} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
