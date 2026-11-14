"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { vi } from "@/messages/vi";
import type { Swatch } from "@/lib/ui/badge-colors";
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
}

/**
 * Khối thống kê dạng thanh ngang với nút chuyển "Biểu đồ | Bảng số liệu" (S36). Dùng chung cho phân phối CEFR
 * và thống kê trạng thái câu hỏi. Thanh ngang là HTML thuần (dễ đọc cho trình đọc màn hình, không cần thư viện biểu đồ).
 */
export function BreakdownCard({ testId, title, note, rows, emptyText }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const isEmpty = total === 0 && emptyText !== undefined;

  return (
    <Card data-testid={`${testId}-distribution`}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {note && <p className="mt-0.5 text-sm text-muted-foreground">{note}</p>}
        </div>
        <div
          role="group"
          aria-label={title}
          className="inline-flex rounded-lg bg-muted p-1 text-xs font-medium"
        >
          {(["chart", "table"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              data-testid={`${testId}-view-${mode}`}
              onClick={() => setView(mode)}
              className={`rounded-md px-3 py-1 transition-colors ${
                view === mode ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              {mode === "chart" ? vi.overview.viewChart : vi.overview.viewTable}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p
            data-testid={`${testId}-empty`}
            className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
          >
            {emptyText}
          </p>
        ) : view === "chart" ? (
          <ul className="space-y-3">
            {rows.map((row) => {
              const pct = percentOf(row.count, total);
              return (
                <li key={row.key} data-testid={`${testId}-row-${row.key}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: row.color.bg, color: row.color.fg }}
                    >
                      {row.label}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCount(row.count)} · <strong>{formatPercent(pct)}</strong>
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={row.label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    className="h-3 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: row.color.bg }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Table data-testid={`${testId}-table`}>
            <TableHeader>
              <TableRow>
                <TableHead>{vi.overview.colLevel}</TableHead>
                <TableHead className="text-right">{vi.overview.colCount}</TableHead>
                <TableHead className="text-right">{vi.overview.colPercent}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{formatCount(row.count)}</TableCell>
                  <TableCell className="text-right">
                    {formatPercent(percentOf(row.count, total))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
