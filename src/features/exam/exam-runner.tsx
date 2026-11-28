"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getNextItem, submitResponse } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import { notifyError } from "@/lib/api/notify-error";
import { OPTION_KEYS, type ExamItem, type OptionKey, type SessionMeta } from "@/lib/api/types";
import { vi } from "@/messages/vi";
import { formatClock, useCountdown } from "./use-countdown";
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  WifiOff,
  Keyboard,
  ShieldCheck,
} from "lucide-react";

interface QuestionProps {
  sessionId: string;
  item: ExamItem;
  session: SessionMeta;
  receivedAt: number;
  onExpired: () => void;
}

function Question({ sessionId, item, session, receivedAt, onExpired }: QuestionProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<OptionKey | null>(null);
  const [shownAt] = useState(() => Date.now());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [networkError, setNetworkError] = useState(false);

  const left = useCountdown(session.expiresAt, session.serverTime, receivedAt);
  const isUrgent = left !== null && left < 300; // Còn dưới 5 phút

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const expired = left === 0;
  const fired = useRef(false);
  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpired();
    }
  }, [expired, onExpired]);

  const submit = useMutation({
    mutationFn: (v: { itemId: string; response: OptionKey }) =>
      submitResponse(sessionId, {
        ...v,
        responseTimeMs: Date.now() - shownAt,
      }),
    onSuccess: async (res) => {
      setNetworkError(false);
      if (res.shouldStop) {
        router.replace(`/student/results/${sessionId}`);
        return;
      }
      setChoice(null);
      await qc.invalidateQueries({ queryKey: ["next-item", sessionId] });
    },
    onError: async (e) => {
      if (e instanceof ApiError && e.code === "SESSION_ITEM_MISMATCH") {
        toast.warning(errorMessage(e));
        await qc.invalidateQueries({ queryKey: ["next-item", sessionId] });
      } else if (e instanceof ApiError && e.code === "SESSION_EXPIRED") {
        toast.info("Thời gian làm bài đã kết thúc.");
        router.replace(`/student/results/${sessionId}`);
      } else {
        setNetworkError(true);
        notifyError(e); // lỗi mạng: giữ nguyên lựa chọn để thử nộp lại
      }
    },
  });

  const handleSelect = useCallback((key: OptionKey) => {
    setChoice(key);
    setNetworkError(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!choice || submit.isPending || !isOnline) return;
    submit.mutate({ itemId: item.id, response: choice });
  }, [choice, submit, isOnline, item.id]);

  // Phím tắt bàn phím: A-D hoặc 1-4, Enter để nộp
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const k = e.key.toUpperCase();
      if (k === "A" || k === "1") handleSelect("A");
      else if (k === "B" || k === "2") handleSelect("B");
      else if (k === "C" || k === "3") handleSelect("C");
      else if (k === "D" || k === "4") handleSelect("D");
      else if (k === "ENTER") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelect, handleSubmit]);

  const skillName = item.skill === "VOCABULARY" ? "Từ vựng" : "Ngữ pháp";

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-4">
      {/* Banner khi mất kết nối mạng */}
      {!isOnline && (
        <div
          data-testid="offline-banner"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Mất kết nối mạng. Đáp án của bạn được giữ tạm thời và sẽ gửi lại khi có mạng.
            </span>
          </div>
        </div>
      )}

      {/* Khung bài thi tập trung L-FOCUS */}
      <section
        data-testid="exam-card"
        className="rounded-2xl border border-outline-variant/30 bg-white p-6 sm:p-8 shadow-sm space-y-6 select-none"
      >
        {/* Top Header: Câu hỏi & Đồng hồ đếm ngược */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
          <div className="space-y-0.5">
            <span
              data-testid="question-index"
              className="text-sm font-bold text-on-surface sm:text-base"
            >
              Câu {session.itemCount + 1}{" "}
              <span className="text-xs font-normal text-on-surface-variant">(tối đa 25)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="question-skill"
              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              {skillName}
            </span>

            {left !== null && (
              <div
                data-testid="timer"
                role="timer"
                aria-live={isUrgent ? "assertive" : "off"}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-sm font-bold tracking-wide transition-colors ${
                  isUrgent
                    ? "bg-amber-100 text-amber-900 animate-pulse border border-amber-300"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{formatClock(left)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Nội dung câu hỏi */}
        <div className="py-2">
          <h2
            data-testid="question-content"
            className="text-lg font-semibold text-on-surface leading-relaxed sm:text-xl"
          >
            {item.content}
          </h2>
        </div>

        {/* 4 Phương án A, B, C, D */}
        <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Phương án trả lời">
          {OPTION_KEYS.map((key) => {
            const isSelected = choice === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                data-testid={`option-${key}`}
                data-option={key}
                aria-checked={isSelected}
                onClick={() => handleSelect(key)}
                className={`group w-full min-h-[58px] px-4 sm:px-5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "border-2 border-primary bg-blue-50/70 shadow-sm"
                    : "border border-outline-variant/60 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                    }`}
                  >
                    {key}
                  </span>
                  <span
                    className={`text-sm sm:text-base leading-relaxed ${
                      isSelected
                        ? "font-semibold text-on-surface"
                        : "text-on-surface-variant font-normal"
                    }`}
                  >
                    {item.options[key]}
                  </span>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Thanh điều khiển đáy: Phím tắt & Nút Nộp đáp án */}
        <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-outline" />
              <span>
                Phím tắt: bấm{" "}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                  A
                </kbd>
                ,{" "}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                  B
                </kbd>
                ,{" "}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                  C
                </kbd>
                ,{" "}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                  D
                </kbd>{" "}
                hoặc{" "}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                  1-4
                </kbd>
              </span>
            </div>
            <span className="text-[11px] text-outline ml-5">
              (Chọn 1 đáp án trước khi bấm Nộp hoặc nhấn Enter)
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
            <Button
              type="button"
              data-testid="submit-answer"
              disabled={!choice || submit.isPending || !isOnline}
              onClick={handleSubmit}
              className={`w-full sm:w-[200px] h-12 rounded-xl font-semibold shadow-sm transition-all duration-150 ${
                choice && isOnline
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {submit.isPending ? (
                <span>Đang ghi nhận...</span>
              ) : (
                <>
                  <span>Nộp đáp án</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {networkError && (
              <div
                id="submit-error-msg"
                className="text-xs text-rose-600 font-medium flex items-center gap-1"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Không gửi được đáp án. Vui lòng thử lại.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dòng bảo đảm bảo mật */}
      <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant/70">
        <ShieldCheck className="h-4 w-4" />
        <span>Thuật toán CAT Rasch 1PL • Dữ liệu bài thi được lưu tự động</span>
      </div>
    </div>
  );
}

export function ExamRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const next = useQuery({
    queryKey: ["next-item", sessionId],
    queryFn: ({ signal }) => getNextItem(sessionId, signal),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const { refetch } = next;

  const onExpired = useCallback(() => {
    toast.info("Đã hết thời gian làm bài.");
    router.replace(`/student/results/${sessionId}`);
  }, [sessionId, router]);

  const finishedId = next.data?.kind === "finished" ? next.data.sessionId : null;
  useEffect(() => {
    if (finishedId) {
      router.replace(`/student/results/${finishedId}`);
    }
  }, [finishedId, router]);

  const goHome =
    next.isError &&
    next.error instanceof ApiError &&
    (next.error.code === "NOT_FOUND" || next.error.code === "FORBIDDEN");
  useEffect(() => {
    if (goHome) router.replace("/student/dashboard");
  }, [goHome, router]);

  if (next.isPending) return <LoadingBlock rows={4} />;
  if (next.isError) {
    const e = next.error;
    if (e instanceof ApiError && e.code === "NO_ITEMS_AVAILABLE") {
      return (
        <Alert data-testid="no-items">
          <AlertTitle>{vi.errors.NO_ITEMS_AVAILABLE}</AlertTitle>
        </Alert>
      );
    }
    if (goHome) return null;
    return <ErrorBlock error={e} onRetry={() => refetch()} />;
  }

  const current = next.data;
  if (current.kind === "finished") {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-primary mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold text-on-surface">Đang tổng hợp kết quả bài thi...</p>
      </div>
    );
  }

  return (
    <Question
      key={current.item.id}
      sessionId={sessionId}
      item={current.item}
      session={current.session}
      receivedAt={next.dataUpdatedAt}
      onExpired={onExpired}
    />
  );
}
