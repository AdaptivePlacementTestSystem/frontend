"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { getHistory } from "@/lib/api/endpoints";
import { vi } from "@/messages/vi";
import { TrendingUp, ArrowRight, PlayCircle, FileText } from "lucide-react";

export function HistoryView({ studentCode }: { studentCode: string | null }) {
  const code = studentCode || "me";

  const q = useQuery({
    queryKey: ["history", code],
    queryFn: ({ signal }) => getHistory(code, signal),
  });

  if (q.isPending) return <LoadingBlock rows={4} />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;

  const history = q.data ?? [];
  const latestCompleted = history.find(
    (h) => h.status === "COMPLETED" || (h.cefrLevel && h.completedAt),
  );

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6 py-4">
      {/* Header & Quick Metrics Pill */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/20">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Hồ sơ năng lực
          </span>
          <h1 className="text-2xl font-bold text-on-surface sm:text-3xl mt-0.5">Lịch sử bài thi</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Xem lại toàn bộ kết quả các kỳ thi xếp lớp và đánh giá định kỳ của bạn.
          </p>
        </div>

        {/* Quick Metrics Summary */}
        <div className="flex items-center gap-4 bg-white p-3 px-5 rounded-2xl border border-outline-variant/30 shadow-sm self-start md:self-auto">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs text-on-surface-variant font-medium">Tổng số đợt thi:</span>
            <span className="text-sm font-bold text-on-surface">{history.length}</span>
          </div>

          <div className="w-px h-4 bg-outline-variant/40" />

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            <span className="text-xs text-on-surface-variant font-medium">Cấp độ hiện tại:</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-900">
              {latestCompleted?.cefrLevel
                ? (vi.cefrLevel[latestCompleted.cefrLevel] ?? latestCompleted.cefrLevel)
                : "Chưa xác định"}
            </span>
          </div>
        </div>
      </div>

      {/* Danh sách rỗng */}
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-white p-12 text-center space-y-3">
          <FileText className="h-10 w-10 text-outline mx-auto" />
          <p className="text-base font-semibold text-on-surface">
            Bạn chưa hoàn thành bài thi nào.
          </p>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Khi bạn tham gia các kỳ thi xếp lớp hoặc khảo sát năng lực thích ứng CAT, kết quả và
            phân tích chi tiết sẽ được lưu tại đây.
          </p>
          <div className="pt-2">
            <Button
              asChild
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              <Link href="/">
                <span>Bắt đầu bài thi</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div
          data-testid="history-table"
          className="rounded-2xl border border-outline-variant/30 bg-white shadow-sm overflow-hidden"
        >
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 h-12 text-on-surface-variant text-xs font-bold uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="px-5">Kỳ thi</th>
                  <th className="px-4">Ngày thi</th>
                  <th className="px-4 text-center">Số câu</th>
                  <th className="px-4 text-center">CEFR</th>
                  <th className="px-4 text-right">Điểm θ (Theta)</th>
                  <th className="px-4 text-right">Sai số SE</th>
                  <th className="px-4 text-center">Trạng thái</th>
                  <th className="px-5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {history.map((row) => {
                  const isCompleted =
                    row.status === "COMPLETED" || (!row.status && !!row.completedAt);
                  const isInProgress = row.status === "IN_PROGRESS";
                  const isTimeout = row.stoppingReason === "TIMEOUT";

                  const examDate = row.completedAt || row.startedAt;
                  const dateStr = examDate
                    ? new Date(examDate).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={row.sessionId}
                      data-testid={`history-row-${row.sessionId}`}
                      className="h-16 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold text-on-surface">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCompleted
                                ? "bg-primary"
                                : isInProgress
                                  ? "bg-amber-500"
                                  : "bg-slate-300"
                            }`}
                          />
                          <span>{row.examRoundTitle ?? "Kỳ thi phân lớp tiếng Anh"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap text-xs">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap text-xs">
                        <span>{row.itemsAdministered} câu</span>
                        {((row.stoppingReason as string) === "SE_REACHED" ||
                          row.stoppingReason === "SE_THRESHOLD") && (
                          <span className="block text-[10px] text-primary font-medium">
                            (Dừng sớm)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {row.cefrLevel ? (
                          <span className="inline-flex items-center justify-center min-w-[50px] h-6 px-2.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900">
                            {vi.cefrLevel[row.cefrLevel] ?? row.cefrLevel}
                          </span>
                        ) : (
                          <span className="text-outline text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold text-xs whitespace-nowrap">
                        {row.theta !== null && row.theta !== undefined ? (
                          <span className="text-primary">
                            {row.theta >= 0 ? `+${row.theta.toFixed(2)}` : row.theta.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-on-surface-variant text-xs whitespace-nowrap">
                        {row.standardError !== null && row.standardError !== undefined ? (
                          row.standardError.toFixed(2)
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>{isTimeout ? "Hết giờ (chấm điểm)" : "Hoàn thành"}</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            <span>Đang làm dở</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>{isTimeout ? "Hết giờ (hủy)" : "Bỏ dở"}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {isCompleted ? (
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="font-semibold text-primary"
                          >
                            <Link href={`/results/${row.sessionId}`}>
                              <span>Xem chi tiết</span>
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : isInProgress ? (
                          <Button
                            asChild
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                          >
                            <Link href={`/exams/${row.examRoundId ?? row.sessionId}/take`}>
                              <span>Tiếp tục</span>
                              <PlayCircle className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden divide-y divide-outline-variant/20">
            {history.map((row) => {
              const isCompleted = row.status === "COMPLETED" || (!row.status && !!row.completedAt);
              const isInProgress = row.status === "IN_PROGRESS";
              const isTimeout = row.stoppingReason === "TIMEOUT";

              const examDate = row.completedAt || row.startedAt;
              const dateStr = examDate
                ? new Date(examDate).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "—";

              return (
                <div
                  key={row.sessionId}
                  data-testid={`history-card-${row.sessionId}`}
                  className="p-4 space-y-3 bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-sm text-on-surface leading-tight">
                      {row.examRoundTitle ?? "Kỳ thi phân lớp tiếng Anh"}
                    </span>
                    {row.cefrLevel ? (
                      <span className="inline-flex items-center justify-center min-w-[44px] h-6 px-2 rounded-full text-xs font-bold bg-sky-100 text-sky-900 shrink-0">
                        {vi.cefrLevel[row.cefrLevel] ?? row.cefrLevel}
                      </span>
                    ) : (
                      <span className="text-xs text-outline">—</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-outline block uppercase text-[10px]">Ngày thi</span>
                      <span className="font-medium text-on-surface">{dateStr}</span>
                    </div>
                    <div>
                      <span className="text-outline block uppercase text-[10px]">Số câu</span>
                      <span className="font-medium text-on-surface">
                        {row.itemsAdministered} câu
                      </span>
                    </div>
                    <div>
                      <span className="text-outline block uppercase text-[10px]">Điểm θ</span>
                      <span className="font-mono font-bold text-primary">
                        {row.theta !== null && row.theta !== undefined
                          ? row.theta >= 0
                            ? `+${row.theta.toFixed(2)}`
                            : row.theta.toFixed(2)
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline block uppercase text-[10px]">Sai số SE</span>
                      <span className="font-mono font-medium text-on-surface">
                        {row.standardError !== null && row.standardError !== undefined
                          ? row.standardError.toFixed(2)
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>{isTimeout ? "Hết giờ (chấm điểm)" : "Hoàn thành"}</span>
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>Đang làm dở</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>{isTimeout ? "Hết giờ (hủy)" : "Bỏ dở"}</span>
                      </span>
                    )}

                    {isCompleted ? (
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="font-semibold text-primary p-0 h-auto"
                      >
                        <Link href={`/results/${row.sessionId}`}>
                          <span>Xem chi tiết</span>
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : isInProgress ? (
                      <Button
                        asChild
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold h-8 text-xs"
                      >
                        <Link href={`/exams/${row.examRoundId ?? row.sessionId}/take`}>
                          <span>Tiếp tục</span>
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-outline">Không có kết quả</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
