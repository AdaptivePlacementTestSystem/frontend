"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { vi } from "@/messages/vi";

interface TasksTabsProps {
  pendingReviews?: number;
  pendingConfirms?: number;
}

export function TasksTabs({ pendingReviews = 0, pendingConfirms = 0 }: TasksTabsProps) {
  const pathname = usePathname();
  const isReviews = pathname.includes("/teacher/tasks/reviews");
  const isConfirms = pathname.includes("/teacher/tasks/confirms");

  return (
    <div className="border-b border-border mb-6" data-testid="tasks-tabs">
      <div className="flex space-x-8">
        <Link
          href="/teacher/tasks/reviews"
          className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            isReviews
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          }`}
          data-testid="tab-reviews"
        >
          <span>{vi.tasks.reviewsTab}</span>
          {pendingReviews > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-semibold">
              {pendingReviews}
            </Badge>
          )}
        </Link>
        <Link
          href="/teacher/tasks/confirms"
          className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            isConfirms
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          }`}
          data-testid="tab-confirms"
        >
          <span>{vi.tasks.confirmsTab}</span>
          {pendingConfirms > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-semibold">
              {pendingConfirms}
            </Badge>
          )}
        </Link>
      </div>
    </div>
  );
}
