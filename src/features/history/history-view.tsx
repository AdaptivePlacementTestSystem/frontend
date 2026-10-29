"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getHistory } from "@/lib/api/endpoints";
import { vi } from "@/messages/vi";

export function HistoryView({ studentCode }: { studentCode: string | null }) {
  const q = useQuery({
    queryKey: ["history", studentCode],
    queryFn: ({ signal }) => getHistory(studentCode!, signal),
    enabled: !!studentCode,
  });
  if (!studentCode) return <EmptyBlock text={vi.history.empty} />;
  if (q.isPending) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{vi.history.title}</h1>
      {q.data.length === 0 ? (
        <EmptyBlock text={vi.history.empty} />
      ) : (
        <Table data-testid="history-table">
          <TableHeader>
            <TableRow>
              <TableHead>{vi.history.date}</TableHead>
              <TableHead>{vi.history.level}</TableHead>
              <TableHead>{vi.history.items}</TableHead>
              <TableHead>
                <span className="sr-only">{vi.history.detail}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.map((h) => (
              <TableRow key={h.sessionId}>
                <TableCell>{new Date(h.completedAt).toLocaleString("vi-VN")}</TableCell>
                <TableCell>{vi.cefrLevel[h.cefrLevel]}</TableCell>
                <TableCell>{h.itemsAdministered}</TableCell>
                <TableCell>
                  <Link className="underline" href={`/results/${h.sessionId}`}>
                    {vi.history.detail}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
