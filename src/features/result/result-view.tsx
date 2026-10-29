"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getResult } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { vi } from "@/messages/vi";
import { ResultCard } from "./result-card";

export function ResultView({ sessionId }: { sessionId: string }) {
  const q = useQuery({
    queryKey: ["result", sessionId],
    queryFn: ({ signal }) => getResult(sessionId, signal),
    retry: false,
    // Hồ sơ có thể chưa sinh xong ngay sau khi nộp câu cuối ⇒ hỏi lại mỗi 2 giây
    refetchInterval: (query) =>
      query.state.error instanceof ApiError && query.state.error.code === "PROFILE_PENDING"
        ? 2000
        : false,
  });

  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.code === "PROFILE_PENDING") {
      return (
        <p role="status" data-testid="result-pending">
          {vi.result.pending}
        </p>
      );
    }
    return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  }
  return (
    <div className="space-y-4">
      <ResultCard result={q.data} />
      <div className="flex flex-wrap gap-3">
        <Button asChild data-testid="go-review">
          <Link href={`/results/${sessionId}/review`}>{vi.result.review}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/history">{vi.result.history}</Link>
        </Button>
      </div>
    </div>
  );
}
