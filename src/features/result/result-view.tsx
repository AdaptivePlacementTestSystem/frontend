"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getResult } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { vi } from "@/messages/vi";
import { ResultCard } from "./result-card";
import { ReviewView } from "./review-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText } from "lucide-react";

export function ResultView({ sessionId }: { sessionId: string }) {
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

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
          <p className="text-base font-medium text-on-surface">{vi.result.pending}</p>
          <p className="text-xs text-on-surface-variant">
            Hệ thống đang tổng hợp dữ liệu và sinh phân tích năng lực từ thuật toán CAT...
          </p>
        </div>
      );
    }
    return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  }

  return (
    <>
      <ResultCard
        result={q.data}
        onOpenReview={(sid) => setReviewSessionId(sid)}
      />
      {reviewSessionId && (
        <Dialog open={!!reviewSessionId} onOpenChange={(open) => !open && setReviewSessionId(null)}>
          <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                <span>Chi tiết câu hỏi &amp; giải thích đáp án bài thi CAT</span>
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <ReviewView sessionId={reviewSessionId} embedded={true} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
