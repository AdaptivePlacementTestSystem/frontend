"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getResult } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { vi } from "@/messages/vi";
import { ResultCard } from "./result-card";
import { Loader2 } from "lucide-react";

export function ResultView({ sessionId }: { sessionId: string }) {
  const q = useQuery({
    queryKey: ["result", sessionId],
    queryFn: ({ signal }) => getResult(sessionId, signal),
    retry: false,
    refetchInterval: (query) =>
      query.state.error instanceof ApiError && query.state.error.code === "PROFILE_PENDING"
        ? 2000
        : false,
  });

  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.code === "PROFILE_PENDING") {
      return (
        <div
          data-testid="result-pending"
          className="flex flex-col items-center justify-center py-16 text-center space-y-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-base font-medium text-on-surface">
            {vi.result.pending}
          </p>
          <p className="text-xs text-on-surface-variant">
            Hệ thống đang tổng hợp dữ liệu và sinh phân tích năng lực từ thuật toán CAT...
          </p>
        </div>
      );
    }
    return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  }

  return <ResultCard result={q.data} />;
}
