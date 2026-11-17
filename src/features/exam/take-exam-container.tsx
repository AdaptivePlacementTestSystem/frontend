"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentRoundSession } from "@/lib/api/endpoints";
import { ExamRunner } from "./exam-runner";
import { LoadingBlock, ErrorBlock } from "@/components/layout/states";

export function TakeExamContainer({ roundId }: { roundId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchSessionId = searchParams.get("sessionId");

  // Gọi endpoint duy nhất xác định session của roundId này (loại bỏ hoàn toàn waterfall)
  const currentSessionQuery = useQuery({
    queryKey: ["round-current-session", roundId],
    queryFn: ({ signal }) => getCurrentRoundSession(roundId, signal),
    staleTime: 0,
    retry: false,
  });

  const { data, isPending, isError, error, refetch } = currentSessionQuery;

  useEffect(() => {
    if (!data) return;

    // 1. Nếu kỳ thi đã hoàn tất -> chuyển hướng ngay sang màn kết quả S05
    if (data.status === "COMPLETED" && data.sessionId) {
      router.replace(`/results/${data.sessionId}`);
      return;
    }

    // 2. Nếu phiên thi bị hủy hoặc chưa bắt đầu -> chuyển hướng về màn giới thiệu S03
    if (data.status === "NOT_STARTED" || data.status === "ABANDONED") {
      router.replace(`/exams/${roundId}`);
      return;
    }
  }, [data, roundId, router]);

  if (isPending) {
    return <LoadingBlock rows={4} />;
  }

  if (isError) {
    return (
      <ErrorBlock
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  // Nếu không có phiên đang chạy (đang trong quá trình redirect)
  if (!data || data.status !== "IN_PROGRESS" || !data.sessionId) {
    return <LoadingBlock rows={4} />;
  }

  // Luôn sử dụng sessionId được server xác thực gắn với roundId này (chống cross-round injection)
  return <ExamRunner sessionId={data.sessionId} />;
}
