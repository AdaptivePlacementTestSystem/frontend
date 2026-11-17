"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getExamRoundDetail, startSession } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import {
  Clock,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Wifi,
  Sparkles,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

export function ExamIntro({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [inProgressSessionId, setInProgressSessionId] = useState<string | null>(null);

  const roundQuery = useQuery({
    queryKey: ["exam-round", roundId],
    queryFn: ({ signal }) => getExamRoundDetail(roundId, signal),
  });

  const start = useMutation({
    mutationFn: () => startSession(roundId),
    onSuccess: () => {
      router.push(`/exams/${roundId}/take`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "SESSION_IN_PROGRESS") {
        const id = (e.details as { sessionId?: string } | undefined)?.sessionId;
        if (id) {
          setInProgressSessionId(id);
          toast.info("Bạn đang có một bài thi dở dang trong hệ thống.");
          return;
        }
      }
      toast.error(errorMessage(e));
    },
  });

  if (roundQuery.isPending) return <LoadingBlock />;
  if (roundQuery.isError) {
    return (
      <ErrorBlock
        error={roundQuery.error}
        onRetry={() => roundQuery.refetch()}
      />
    );
  }

  const round = roundQuery.data;

  return (
    <div className="mx-auto w-full max-w-[800px] space-y-6 py-4 sm:py-8">
      {/* Thẻ Modal/Cảnh báo nếu đang có phiên dở dang */}
      {inProgressSessionId && (
        <div className="rounded-xl border border-primary/30 bg-blue-50/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-on-surface text-base">
                Bạn đang có một bài thi dở dang
              </h3>
              <p className="text-sm text-on-surface-variant">
                Hệ thống phát hiện phiên thi trước của bạn chưa được nộp. Bạn có thể tiếp tục làm bài ngay để không bị mất thời gian.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  <Link href={`/exams/${roundId}/take`}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Tiếp tục bài thi
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  disabled
                  title="Chưa hỗ trợ hủy phiên thi theo quy định khảo thí"
                  className="text-slate-400 border-slate-200 cursor-not-allowed"
                >
                  Hủy bài cũ và bắt đầu lại
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thẻ chính Giới thiệu bài thi S03 */}
      <div className="rounded-2xl border border-outline-variant/30 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Tiêu đề & Thông tin cơ bản */}
        <div className="space-y-3 pb-5 border-b border-outline-variant/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
              Kỳ thi trực tuyến
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              Định dạng thích ứng CAT • Rasch Model
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {round.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-medium text-on-surface">
              <Clock className="h-4 w-4 text-primary" />
              Thời lượng: {round.durationMinutes} phút
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium text-on-surface">
              <HelpCircle className="h-4 w-4 text-secondary" />
              Tối đa 25 câu hỏi (Dừng khi SE &lt; 0.35)
            </span>
          </div>
        </div>

        {/* 6 Lưu ý quan trọng */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Lưu ý quan trọng trước khi làm bài
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-outline-variant/20 bg-slate-50/60 p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">
                1. Tính giờ làm bài
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Đồng hồ chỉ bắt đầu đếm ngược khi bạn nhấn nút xác nhận bên dưới.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/20 bg-slate-50/60 p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">
                2. Giờ đóng kỳ thi
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Thời gian làm bài không vượt quá giờ kết thúc đợt khảo thí của trường.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/20 bg-slate-50/60 p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">
                3. Đề thi thích ứng
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Mỗi thí sinh có một lộ trình câu hỏi riêng thay đổi theo năng lực thực tế.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/20 bg-slate-50/60 p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">
                4. Không thể quay lại
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Sau khi nộp một câu hỏi, bạn không thể quay lại để sửa đáp án câu trước.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/20 bg-slate-50/60 p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">
                5. Bảo mật kết quả
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Hệ thống không hiển thị đúng/sai hay điểm số ước lượng trong lúc làm bài.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/20 bg-slate-50/60 p-4 space-y-1">
              <p className="font-semibold text-xs text-primary uppercase tracking-wider">
                6. Kết thúc sớm
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Bài thi có thể dừng sớm (từ câu 8) khi đạt độ tin cậy chuẩn (SE &lt; 0.35).
              </p>
            </div>
          </div>
        </div>

        {/* Cảnh báo đường truyền */}
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-slate-50 p-4 text-xs text-on-surface-variant">
          <Wifi className="h-5 w-5 text-primary shrink-0" />
          <span>
            Đảm bảo kết nối Internet ổn định trong suốt quá trình thi để thuật toán CAT ghi nhận câu trả lời liên tục.
          </span>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-outline-variant/20">
          <Button
            asChild
            variant="ghost"
            data-testid="intro-back"
            className="w-full sm:w-auto h-12 text-on-surface-variant hover:text-on-surface font-semibold"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>Quay lại trang chủ</span>
            </Link>
          </Button>

          <Button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            data-testid="confirm-start"
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            {start.isPending ? (
              <span>Đang chuẩn bị đề thi...</span>
            ) : (
              <>
                <span>Tôi đã hiểu, bắt đầu làm bài</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
