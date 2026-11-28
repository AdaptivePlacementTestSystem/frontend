"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { ApiError } from "@/lib/api/errors";
import { getStudentProfile } from "@/lib/api/endpoints";
import { ResultCard } from "@/features/result/result-card";
import { vi } from "@/messages/vi";
import { Search, UserCheck, ArrowRight, UserX, AlertCircle } from "lucide-react";

export function StudentLookup() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["profile", code],
    queryFn: ({ signal }) => getStudentProfile(code!, signal),
    enabled: !!code,
    retry: false,
  });

  const notFound =
    q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setValidationError(vi.students.requiredCode);
      setCode(null);
      return;
    }
    setValidationError(null);
    setCode(trimmed); // Tra cứu đúng MSSV (DC-O6)
  };

  return (
    <div className="mx-auto max-w-[560px] space-y-6 py-6">
      {/* S13 Header & Card Căn giữa ≤ 560px */}
      <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{vi.students.title}</h1>
          <p className="text-sm text-muted-foreground">
            Nhập chính xác mã số sinh viên (MSSV) để xem hồ sơ năng lực và lịch sử kiểm tra CAT.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSearch}>
          <div className="space-y-2">
            <Label htmlFor="student-code-input" className="text-sm font-medium">
              {vi.students.codeLabel}
            </Label>
            <div className="relative">
              <Input
                id="student-code-input"
                name="studentCode"
                value={input}
                placeholder={vi.students.codePlaceholder}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="pr-10 h-11 text-base font-mono"
                data-testid="student-code-input"
                autoFocus
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {validationError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {validationError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base font-medium"
            data-testid="student-search"
            disabled={q.isFetching}
          >
            {q.isFetching ? vi.common.loading : vi.students.searchBtn}
          </Button>
        </form>
      </div>

      {/* Loading Block */}
      {code && q.isFetching && <LoadingBlock rows={3} />}

      {/* Error & Not Found Alert */}
      {code &&
        q.isError &&
        !q.isFetching &&
        (notFound ? (
          <Alert
            variant="destructive"
            data-testid="student-not-found"
            className="rounded-xl border"
          >
            <UserX className="h-4 w-4" />
            <AlertDescription className="font-medium">{vi.students.notFound}</AlertDescription>
          </Alert>
        ) : (
          <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
        ))}

      {/* Found Student Result Summary Card */}
      {q.data && !q.isFetching && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {q.data.student.fullName
                  .split(" ")
                  .filter(Boolean)
                  .slice(-2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase() || "SV"}
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground" data-testid="student-name">
                  {q.data.student.fullName}
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  MSSV: {q.data.student.studentCode}
                </p>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              className="gap-1.5 self-start sm:self-auto"
              onClick={() =>
                router.push(`/teacher/students/${encodeURIComponent(q.data.student.studentCode)}`)
              }
            >
              <span>Xem chi tiết hồ sơ (S14)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Preview of Latest Result */}
          {q.data.latest ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {vi.students.latest}
                </span>
                <span className="text-xs text-muted-foreground">
                  {q.data.latest.completedAt
                    ? new Date(q.data.latest.completedAt).toLocaleDateString("vi-VN")
                    : ""}
                </span>
              </div>
              <ResultCard result={q.data.latest} showFooter={false} showBackHome={false} />
            </div>
          ) : (
            <Alert className="rounded-xl border">
              <UserCheck className="h-4 w-4" />
              <AlertDescription>{vi.students.noProfile}</AlertDescription>
            </Alert>
          )}

          {/* Direct link button */}
          <div className="pt-2 text-center">
            <Link
              href={`/teacher/students/${encodeURIComponent(q.data.student.studentCode)}`}
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Chuyển đến trang hồ sơ năng lực độc lập &amp; lịch sử làm bài →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
