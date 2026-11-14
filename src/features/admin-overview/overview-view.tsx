"use client";

import { CEFR_LEVELS, ITEM_STATUSES } from "@apt/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { NativeSelect } from "@/components/layout/native-select";
import { getSystemOverview } from "@/lib/api/endpoints";
import { CEFR_COLORS, ITEM_STATUS_COLORS } from "@/lib/ui/badge-colors";
import { vi } from "@/messages/vi";
import { BreakdownCard, type BreakdownRow } from "./breakdown-card";
import { OpenRoundsTable } from "./open-rounds-table";
import { StatCard } from "./stat-card";

const timeFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });

/** Tổng quan hệ thống (S36, F-29): trang chủ Admin. Không tự cập nhật; làm mới khi tải trang hoặc bấm "Làm mới". */
export function OverviewView() {
  const [roundId, setRoundId] = useState("");
  const query = useQuery({
    queryKey: ["overview", roundId || null],
    queryFn: ({ signal }) => getSystemOverview(roundId || undefined, signal),
  });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    const result = await query.refetch();
    setRefreshing(false);
    if (result.isSuccess) toast.success(vi.overview.refreshed);
  };

  const data = query.data;
  const cefrRows: BreakdownRow[] = data
    ? CEFR_LEVELS.map((level) => ({
        key: level,
        label: vi.cefrLevel[level],
        count: data.cefrDistribution[level] ?? 0,
        color: CEFR_COLORS[level],
      }))
    : [];
  const statusRows: BreakdownRow[] = data
    ? ITEM_STATUSES.map((status) => ({
        key: status,
        label: vi.itemStatus[status],
        count: data.itemStatusCounts[status] ?? 0,
        color: ITEM_STATUS_COLORS[status],
      }))
    : [];
  const totalItems = statusRows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{vi.overview.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{vi.overview.subtitle}</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-56 space-y-1">
            <Label htmlFor="round-filter">{vi.overview.roundFilterLabel}</Label>
            <NativeSelect
              id="round-filter"
              data-testid="round-filter"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
            >
              <option value="">{vi.overview.allRounds}</option>
              {/* Tạm thời chỉ liệt kê kỳ đang mở: chưa có GET /exam-rounds để liệt kê mọi kỳ. */}
              {data?.openRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            variant="outline"
            onClick={refresh}
            disabled={refreshing || query.isFetching}
            data-testid="overview-refresh"
          >
            {vi.overview.refresh}
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <LoadingBlock rows={4} />
      ) : query.isError || !data ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              testId="stat-students"
              label={vi.overview.statStudents}
              value={data.studentsCompleted}
              note={vi.overview.statStudentsNote}
            />
            <StatCard
              testId="stat-final-approved"
              label={vi.overview.statItems}
              value={data.finalApprovedItems}
              note={vi.overview.statItemsNote}
            />
            <StatCard
              testId="stat-batches-open"
              label={vi.overview.statBatches}
              value={data.batchesNeedingAction}
              badge={
                data.batchesNeedingAction > 0 ? (
                  <Badge variant="secondary">{vi.overview.statBatchesBadge}</Badge>
                ) : undefined
              }
              link={{ href: "/admin/item-batches", label: vi.overview.statBatchesLink }}
            />
            <StatCard
              testId="stat-open-rounds"
              label={vi.overview.statRounds}
              value={data.openExamRounds}
              link={{ href: "/admin/exam-rounds", label: vi.overview.statRoundsLink }}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              testId="cefr"
              title={vi.overview.cefrTitle}
              note={vi.overview.cefrNote}
              rows={cefrRows}
              emptyText={vi.overview.cefrEmpty}
            />
            <div className="space-y-2">
              <BreakdownCard
                testId="item-status"
                title={vi.overview.statusTitle}
                note={vi.overview.statusTotal(totalItems)}
                rows={statusRows}
              />
              <div className="text-right">
                <Link
                  href="/admin/item-bank"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {vi.overview.statusLink} →
                </Link>
              </div>
            </div>
          </div>

          <OpenRoundsTable
            rounds={data.openRounds}
            updatedAt={timeFormat.format(new Date(data.generatedAt))}
          />
        </>
      )}
    </div>
  );
}
