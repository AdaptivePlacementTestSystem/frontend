"use client";

import { Badge } from "@/components/ui/badge";
import { vi } from "@/messages/vi";

interface DueBadgeProps {
  dueAt: string | Date | null | undefined;
  showDate?: boolean;
}

export function DueBadge({ dueAt, showDate = true }: DueBadgeProps) {
  if (!dueAt) return null;

  const dueDate = new Date(dueAt);
  if (isNaN(dueDate.getTime())) return null;

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dueDate);

  if (diffMs < 0) {
    return (
      <div className="inline-flex items-center gap-1.5" data-testid="due-badge">
        <Badge variant="destructive" className="font-semibold">
          {vi.tasks.overdue}
        </Badge>
        {showDate && <span className="text-xs text-muted-foreground">{formattedDate}</span>}
      </div>
    );
  }

  if (diffHours <= 24) {
    return (
      <div className="inline-flex items-center gap-1.5" data-testid="due-badge">
        <Badge className="bg-amber-500 text-white hover:bg-amber-600 font-semibold">
          Hạn trong 24h
        </Badge>
        {showDate && <span className="text-xs text-muted-foreground">{formattedDate}</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5" data-testid="due-badge">
      <Badge variant="outline" className="font-medium text-muted-foreground">
        {`Còn ${diffDays} ngày`}
      </Badge>
      {showDate && <span className="text-xs text-muted-foreground">{formattedDate}</span>}
    </div>
  );
}
