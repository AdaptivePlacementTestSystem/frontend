"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { downloadCsv, getClassDistribution, getClassErrorPatterns } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/error-message";
import type { ExportType } from "@/lib/api/types";
import { vi } from "@/messages/vi";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const dist = useQuery({
    queryKey: ["report", "distribution"],
    queryFn: ({ signal }) => getClassDistribution(undefined, signal),
  });
  const errs = useQuery({
    queryKey: ["report", "errors"],
    queryFn: ({ signal }) => getClassErrorPatterns(undefined, signal),
  });
  const [busy, setBusy] = useState<ExportType | null>(null);

  const exportCsv = async (type: ExportType) => {
    setBusy(type);
    try {
      const { blob, filename } = await downloadCsv(type);
      saveBlob(blob, filename);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const chart =
    dist.data?.distribution.map((d) => ({ name: vi.cefrLevel[d.cefrLevel], count: d.count })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{vi.reports.title}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => exportCsv("distribution")}
            data-testid="export-distribution"
          >
            {vi.reports.exportDistribution}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => exportCsv("profiles")}
            data-testid="export-profiles"
          >
            {vi.reports.exportProfiles}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{vi.reports.distribution}</CardTitle>
        </CardHeader>
        <CardContent>
          {dist.isPending ? (
            <LoadingBlock rows={3} />
          ) : dist.isError ? (
            <ErrorBlock error={dist.error} onRetry={() => dist.refetch()} />
          ) : dist.data.total === 0 ? (
            <EmptyBlock text={vi.reports.empty} />
          ) : (
            <>
              <p className="mb-2 text-sm text-muted-foreground" data-testid="report-total">
                {vi.reports.total}: {dist.data.total}
              </p>
              <div className="h-64 w-full" role="img" aria-label={vi.reports.distribution}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-chart-1)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {dist.data.itemsByStatus && (
                <p className="mt-3 text-sm">
                  {vi.reports.itemsByStatus}:{" "}
                  {dist.data.itemsByStatus
                    .map((s) => `${vi.itemStatus[s.status]} ${s.count}`)
                    .join(" · ")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{vi.reports.errorPatterns}</CardTitle>
        </CardHeader>
        <CardContent>
          {errs.isPending ? (
            <LoadingBlock rows={3} />
          ) : errs.isError ? (
            <ErrorBlock error={errs.error} onRetry={() => errs.refetch()} />
          ) : errs.data.length === 0 ? (
            <EmptyBlock text={vi.reports.empty} />
          ) : (
            <Table data-testid="error-patterns">
              <TableHeader>
                <TableRow>
                  <TableHead>{vi.items.topic}</TableHead>
                  <TableHead>{vi.items.skill}</TableHead>
                  <TableHead>{vi.reports.studentCount}</TableHead>
                  <TableHead>{vi.reports.errorRate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errs.data.map((e) => (
                  <TableRow key={e.topicTag}>
                    <TableCell>{e.topicTag}</TableCell>
                    <TableCell>{vi.skill[e.skill]}</TableCell>
                    <TableCell>{e.studentCount}</TableCell>
                    <TableCell>{Math.round(e.errorRate * 100)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
