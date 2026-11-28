"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { TasksTabs } from "@/components/review/tasks-tabs";
import { DueBadge } from "@/components/review/due-badge";
import { getTeacherConfirmTasks } from "@/lib/api/endpoints";
import { vi } from "@/messages/vi";

export default function ConfirmTasksPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["teacher", "tasks", "confirms"],
    queryFn: ({ signal }) => getTeacherConfirmTasks(signal),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{vi.tasks.title}</h1>
      </div>

      <TasksTabs
        pendingReviews={data?.stats.pendingReviews}
        pendingConfirms={data?.stats.pendingConfirms}
      />

      {isPending ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock error={error} onRetry={() => refetch()} />
      ) : !data || data.batches.length === 0 ? (
        <EmptyBlock text={vi.tasks.emptyConfirms} />
      ) : (
        <div className="space-y-4" data-testid="inbox-confirm-list">
          {data.batches.map((batch) => {
            const percent =
              batch.totalAssigned > 0
                ? Math.round((batch.decidedCount / batch.totalAssigned) * 100)
                : 0;

            return (
              <Card key={batch.batchId} data-testid={`batch-row-${batch.batchId}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold">{batch.batchName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Mã lô: <span className="font-mono">{batch.batchId}</span>
                    </p>
                  </div>
                  <DueBadge dueAt={batch.dueAt} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5" data-testid="batch-progress">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-muted-foreground">
                        {vi.tasks.processedProgress} {batch.decidedCount} / {batch.totalAssigned}
                      </span>
                      <span className="font-semibold">{percent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="text-emerald-700 bg-emerald-50 border-emerald-200"
                    >
                      ✓ Đã xác nhận: {batch.confirmedCount}
                    </Badge>
                    <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">
                      ✕ Đã loại: {batch.removedCount}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      Chờ xác nhận: {batch.pendingCount}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      {batch.pendingCount > 0 ? (
                        <span>
                          Còn <strong className="text-foreground">{batch.pendingCount}</strong> câu
                          cần thẩm định
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">
                          ✓ Đã hoàn tất thẩm định cho toàn bộ câu được giao
                        </span>
                      )}
                    </p>
                    <Button asChild data-testid={`open-confirm-batch-${batch.batchId}`}>
                      <Link href={`/teacher/tasks/confirms/${batch.batchId}`}>
                        {vi.tasks.openConfirmBatch}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
