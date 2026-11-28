"use client";

import { CEFR_LEVELS } from "@apt/shared-types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { apiRequest } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";
import { notifyError } from "@/lib/api/notify-error";
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
  const [examRoundId, setExamRoundId] = useState("");
  const rounds = useQuery({
    queryKey: ["report", "exam-rounds"],
    queryFn: ({ signal }) =>
      apiRequest<
        paths["/api/v1/reports/exam-rounds"]["get"]["responses"][200]["content"]["application/json"]
      >("/reports/exam-rounds", { signal }),
  });
  const dist = useQuery({
    queryKey: ["report", "distribution", examRoundId],
    queryFn: ({ signal }) => getClassDistribution(examRoundId || undefined, signal),
  });
  const errs = useQuery({
    queryKey: ["report", "errors", examRoundId],
    queryFn: ({ signal }) => getClassErrorPatterns(examRoundId || undefined, signal),
  });
  const [busy, setBusy] = useState<ExportType | null>(null);

  const exportCsv = async (type: ExportType) => {
    setBusy(type);
    try {
      const { blob, filename } = await downloadCsv(type, examRoundId || undefined);
      saveBlob(blob, filename);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(null);
    }
  };

  const chart = CEFR_LEVELS.map((level) => ({
    name: vi.cefrLevel[level],
    count: dist.data?.cefrDistribution?.[level] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{vi.reports.title}</h1>
        <label>
          Kỳ thi{" "}
          <select
            aria-label="Kỳ thi"
            value={examRoundId}
            onChange={(event) => setExamRoundId(event.target.value)}
            disabled={rounds.isPending || rounds.isError}
          >
            <option value="">Tất cả kỳ thi</option>
            {rounds.data?.map((round) => (
              <option key={round.id} value={round.id}>
                {round.name}
              </option>
            ))}
          </select>
        </label>
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

      {rounds.isError && <ErrorBlock error={rounds.error} onRetry={() => rounds.refetch()} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{vi.reports.distribution}</CardTitle>
        </CardHeader>
        <CardContent>
          {dist.isPending ? (
            <LoadingBlock rows={3} />
          ) : dist.isError ? (
            <ErrorBlock error={dist.error} onRetry={() => dist.refetch()} />
          ) : dist.data.totalStudents === 0 ? (
            <EmptyBlock text={vi.reports.empty} />
          ) : (
            <>
              <p className="mb-2 text-sm text-muted-foreground" data-testid="report-total">
                {vi.reports.total}: {dist.data.totalStudents}
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
                  <TableRow key={`${e.skill}:${e.topicTag}`}>
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
