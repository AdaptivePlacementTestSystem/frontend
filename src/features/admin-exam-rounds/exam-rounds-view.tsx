"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { listExamRounds, type RoundStatus } from "./api";

const statuses: { value: RoundStatus; label: string }[] = [
  { value: "OPEN", label: "Đang mở" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "DRAFT", label: "Bản nháp" },
];
const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
export function ExamRoundsView() {
  const [filter, setFilter] = useState<RoundStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["exam-rounds"],
    queryFn: ({ signal }) => listExamRounds(signal),
  });
  const rounds = query.data ?? [];
  const filtered = rounds.filter(
    (r) =>
      (filter === "ALL" || r.effectiveStatus === filter) &&
      r.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[32px] font-bold tracking-tight text-on-surface">
          Quản lý kỳ thi khảo thí
        </h1>
        <Link
          href="/admin/exam-rounds/new"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-container px-6 font-semibold text-white shadow-md hover:bg-primary"
        >
          <MaterialIcon name="add_circle" /> Tạo kỳ thi mới
        </Link>
      </div>
      {query.isPending ? (
        <LoadingBlock rows={4} />
      ) : query.isError ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statuses.map((s) => (
              <div
                key={s.value}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-outline">
                  {s.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-on-surface">
                  {rounds.filter((r) => r.effectiveStatus === s.value).length}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-surface-container-low" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {[{ value: "ALL" as const, label: "Tất cả kỳ thi" }, ...statuses].map((s) => (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => setFilter(s.value)}
                  aria-pressed={filter === s.value}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === s.value ? "bg-primary-container text-white" : "bg-surface-container-low text-on-surface-variant"}`}
                >
                  {s.label} (
                  {s.value === "ALL"
                    ? rounds.length
                    : rounds.filter((r) => r.effectiveStatus === s.value).length}
                  )
                </button>
              ))}
            </div>
            <input
              aria-label="Tìm kỳ thi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên kỳ thi..."
              className="h-10 rounded-lg border border-slate-200 bg-surface px-3 text-sm"
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    {[
                      "Tên kỳ thi",
                      "Thời gian mở",
                      "Thời gian đóng",
                      "Thời lượng",
                      "Trạng thái",
                      "Thí sinh",
                    ].map((h) => (
                      <th key={h} className="px-4 py-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-4 font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/admin/exam-rounds/${r.id}`}
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{date(r.opensAt)}</td>
                      <td className="px-4 py-4">{date(r.closesAt)}</td>
                      <td className="px-4 py-4">{r.durationMinutes} phút</td>
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-surface-container px-2 py-1 text-xs font-semibold">
                          {statuses.find((s) => s.value === r.effectiveStatus)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">{r.participantCount}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                        {rounds.length === 0
                          ? "Chưa có kỳ thi nào."
                          : "Không tìm thấy kỳ thi phù hợp."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
