"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { vi } from "@/messages/vi";
import type { Swatch } from "@/lib/ui/badge-colors";
import { cn } from "@/lib/utils";
import { formatCount, formatPercent, percentOf } from "./overview-math";

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  color: Swatch;
}

interface Props {
  /** Tiền tố `data-testid` ("cefr" → `cefr-distribution`, `cefr-row-B1`…). */
  testId: string;
  title: string;
  note?: string;
  rows: BreakdownRow[];
  /** Hiện thay cho biểu đồ khi không có số liệu nào (tổng bằng 0). */
  emptyText?: string;
  /** `bars`: thanh ngang + nút "Biểu đồ | Bảng số liệu" (phân phối CEFR); `donut`: biểu đồ vòng + chú giải (trạng thái câu hỏi). */
  variant?: "bars" | "donut";
  /** Biểu tượng ô nhỏ cạnh tiêu đề (chỉ kiểu `donut`). */
  icon?: string;
  /** Chữ nhỏ dưới số tổng ở giữa vòng. */
  centerLabel?: string;
  className?: string;
}

function Donut({
  rows,
  total,
  centerLabel,
  label,
}: {
  rows: BreakdownRow[];
  total: number;
  centerLabel?: string;
  label: string;
}) {
  const radius = 15.915; // chu vi ≈ 100 ⇒ độ dài cung = phần trăm
  let offset = 0;
  return (
    <div className="relative flex size-44 items-center justify-center">
      <svg viewBox="0 0 36 36" role="img" aria-label={label} className="size-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-surface-container-low"
        />
        {total > 0 &&
          rows.map((row) => {
            const pct = percentOf(row.count, total);
            const circle = (
              <circle
                key={row.key}
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                strokeWidth="4"
                stroke={row.color.bg}
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={-offset}
              />
            );
            offset += pct;
            return circle;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl leading-8 font-bold text-on-surface">{formatCount(total)}</span>
        {centerLabel && (
          <span className="text-xs font-semibold tracking-wider text-outline uppercase">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Khối thống kê của S36, đúng kiểu Stitch. `bars`: thanh ngang có nút chuyển "Biểu đồ | Bảng số liệu" (CEFR);
 * `donut`: biểu đồ vòng kèm chú giải từng trạng thái (câu hỏi). Thanh ngang là HTML thuần, không cần thư viện biểu đồ.
 */
export function BreakdownCard({
  testId,
  title,
  note,
  rows,
  emptyText,
  variant = "bars",
  icon = "pie_chart",
  centerLabel,
  className,
}: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const isEmpty = total === 0 && emptyText !== undefined;

  return (
    <div
      data-testid={`${testId}-distribution`}
      className={cn("rounded-xl bg-surface-container-lowest p-8 shadow-sm", className)}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl leading-7 font-semibold text-on-surface">{title}</h2>
          {note && <p className="mt-0.5 text-[13px] text-outline">{note}</p>}
        </div>
        {variant === "bars" ? (
          <div
            role="group"
            aria-label={title}
            className="inline-flex rounded-lg bg-surface-container-low p-1"
          >
            {(["chart", "table"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                data-testid={`${testId}-view-${mode}`}
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                  view === mode
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-outline hover:text-on-surface",
                )}
              >
                {mode === "chart" ? vi.overview.viewChart : vi.overview.viewTable}
              </button>
            ))}
          </div>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-lg bg-surface-container-low text-primary">
            <MaterialIcon name={icon} size={20} />
          </span>
        )}
      </div>

      {isEmpty ? (
        <p
          data-testid={`${testId}-empty`}
          className="rounded-lg border border-dashed border-outline-variant p-6 text-center text-sm text-outline"
        >
          {emptyText}
        </p>
      ) : variant === "donut" ? (
        <>
          <div className="mb-4 flex justify-center py-2">
            <Donut rows={rows} total={total} centerLabel={centerLabel} label={title} />
          </div>
          <ul className="space-y-2.5">
            {rows.map((row) => (
              <li
                key={row.key}
                data-testid={`${testId}-row-${row.key}`}
                className="flex items-center justify-between rounded-lg bg-surface-container-low p-2.5 transition-colors hover:bg-surface-container"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-on-surface">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color.bg }}
                  />
                  {row.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-on-surface">
                    {formatCount(row.count)} câu
                  </span>
                  <span className="text-xs text-outline">
                    {formatPercent(percentOf(row.count, total))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : view === "chart" ? (
        <ul className="space-y-4 pt-2">
          {rows.map((row) => {
            const pct = percentOf(row.count, total);
            return (
              <li key={row.key} data-testid={`${testId}-row-${row.key}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: row.color.bg, color: row.color.fg }}
                  >
                    {row.label}
                  </span>
                  <span className="flex items-center gap-3 text-[13px] text-outline">
                    <span>{formatCount(row.count)} thí sinh</span>
                    <strong className="w-12 text-right font-semibold text-on-surface">
                      {formatPercent(pct)}
                    </strong>
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={row.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                  className="h-3 w-full overflow-hidden rounded-full bg-surface-container-low"
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: row.color.bg }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <table data-testid={`${testId}-table`} className="w-full text-left text-[13px]">
          <thead>
            <tr className="bg-surface-container-low text-xs font-semibold tracking-wider text-outline uppercase">
              <th className="rounded-l-lg px-3 py-2.5">{vi.overview.colLevel}</th>
              <th className="px-3 py-2.5 text-right">{vi.overview.colCount}</th>
              <th className="rounded-r-lg px-3 py-2.5 text-right">{vi.overview.colPercent}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-3 py-2.5 font-semibold">{row.label}</td>
                <td className="px-3 py-2.5 text-right">{formatCount(row.count)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">
                  {formatPercent(percentOf(row.count, total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
