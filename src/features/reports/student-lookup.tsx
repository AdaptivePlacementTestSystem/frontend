"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { ApiError } from "@/lib/api/errors";
import { getStudentProfile } from "@/lib/api/endpoints";
import { ResultCard } from "@/features/result/result-card";
import { vi } from "@/messages/vi";

export function StudentLookup() {
  const [input, setInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["profile", code],
    queryFn: ({ signal }) => getStudentProfile(code!, signal),
    enabled: !!code,
    retry: false,
  });

  const notFound =
    q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">{vi.students.title}</h1>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setCode(input.trim() || null); // tra cứu đúng MSSV, không tìm gần đúng (O6)
        }}
      >
        <div className="flex-1 space-y-1">
          <Label htmlFor="mssv">MSSV</Label>
          <Input
            id="mssv"
            value={input}
            placeholder={vi.students.placeholder}
            onChange={(e) => setInput(e.target.value)}
            data-testid="mssv-input"
          />
        </div>
        <Button type="submit" data-testid="mssv-search">
          {vi.students.search}
        </Button>
      </form>

      {code && q.isFetching && <LoadingBlock rows={3} />}
      {code &&
        q.isError &&
        !q.isFetching &&
        (notFound ? (
          <Alert data-testid="student-not-found">
            <AlertDescription>{vi.students.notFound}</AlertDescription>
          </Alert>
        ) : (
          <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
        ))}
      {q.data && !q.isFetching && (
        <div className="space-y-4">
          <p className="font-medium" data-testid="student-name">
            {q.data.student.fullName} · {q.data.student.studentCode}
          </p>
          {q.data.latest ? (
            <>
              <h2 className="text-sm text-muted-foreground">{vi.students.latest}</h2>
              <ResultCard result={q.data.latest} />
            </>
          ) : (
            <Alert>
              <AlertDescription>{vi.students.noResult}</AlertDescription>
            </Alert>
          )}
          {q.data.history.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{vi.history.date}</TableHead>
                  <TableHead>{vi.history.level}</TableHead>
                  <TableHead>{vi.history.items}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.history.map((h) => (
                  <TableRow key={h.sessionId}>
                    <TableCell>{new Date(h.completedAt).toLocaleString("vi-VN")}</TableCell>
                    <TableCell>{vi.cefrLevel[h.cefrLevel]}</TableCell>
                    <TableCell>{h.itemsAdministered}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
