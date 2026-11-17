"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getReview } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { OPTION_KEYS, type OptionKey, type ReviewEntry } from "@/lib/api/types";
import { parseExplanation } from "@/lib/explanation";
import { vi } from "@/messages/vi";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Check,
  User,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BarChart3,
  CheckCircle,
  BadgeCheck,
} from "lucide-react";

type FilterType = "all" | "wrong" | "vocab" | "grammar";

function ExplanationPanel({
  entry,
  index,
}: {
  entry: ReviewEntry;
  index: number;
}) {
  const exp = parseExplanation(entry.explanation);
  if (!exp) {
    return (
      <div
        data-testid={`no-explanation-${index}`}
        className="rounded-xl bg-surface-container-low p-space-md text-xs sm:text-sm text-on-surface-variant flex items-center gap-2.5 italic border border-outline-variant/20"
      >
        <HelpCircle className="h-4 w-4 text-outline shrink-0" />
        <span>Câu này chưa có giải thích chi tiết từ hệ thống.</span>
      </div>
    );
  }

  return (
    <div
      data-testid={`review-explanation-${index}`}
      className="rounded-xl bg-surface-container-low p-space-md sm:p-space-lg flex flex-col gap-space-xs border border-outline-variant/20"
    >
      <div className="flex items-center gap-2 text-primary-container font-semibold text-sm">
        <Lightbulb className="h-4 w-4 text-primary shrink-0" />
        <span>Giải thích chi tiết từ AI</span>
      </div>

      {exp.general && (
        <p
          data-testid="explanation-general"
          className="text-sm text-on-surface leading-relaxed mt-1"
        >
          {exp.general}
        </p>
      )}

      {/* Chi tiết từng phương án nếu có */}
      <div className="space-y-1.5 pt-2">
        {OPTION_KEYS.filter((k) => exp.options[k]).map((k) => (
          <div
            key={k}
            data-testid={`explanation-option-${k}`}
            className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/15 text-xs sm:text-sm text-on-surface-variant flex items-start gap-2.5"
          >
            <span className="font-bold text-primary shrink-0 w-4">{k}:</span>
            <span className="leading-relaxed">{exp.options[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewView({ sessionId }: { sessionId: string }) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({ 1: true });
  const [filter, setFilter] = useState<FilterType>("all");

  const q = useQuery({
    queryKey: ["review", sessionId],
    queryFn: ({ signal }) => getReview(sessionId, signal),
    retry: false,
  });

  const toggleAccordion = (order: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [order]: !prev[order],
    }));
  };

  const backBtn = (
    <Button
      asChild
      variant="outline"
      className="h-10 px-4 rounded-xl font-semibold border-outline-variant/30 hover:bg-surface-container-low transition-colors"
    >
      <Link href={`/results/${sessionId}`}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        <span>Quay lại kết quả</span>
      </Link>
    </Button>
  );

  if (q.isPending) return <LoadingBlock rows={5} />;

  if (q.isError) {
    if (q.error instanceof ApiError && q.error.code === "REVIEW_DISABLED") {
      return (
        <div className="mx-auto w-full max-w-[800px] space-y-5 py-6">
          <Alert
            data-testid="review-disabled"
            className="rounded-xl border-amber-500/30 bg-amber-50 text-amber-900 p-5 shadow-sm"
          >
            <AlertTitle className="text-base font-bold">
              {vi.review.disabledTitle}
            </AlertTitle>
            <AlertDescription className="text-sm mt-1">
              {vi.review.disabledBody}
            </AlertDescription>
          </Alert>
          {backBtn}
        </div>
      );
    }
    return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  }

  const entries = q.data ?? [];
  const correctCount = entries.filter((e) => e.isCorrect).length;
  const wrongCount = entries.length - correctCount;
  const vocabCount = entries.filter((e) => e.skill === "VOCABULARY").length;
  const grammarCount = entries.filter((e) => e.skill === "GRAMMAR").length;

  const filteredEntries = entries.filter((e) => {
    if (filter === "wrong") return !e.isCorrect;
    if (filter === "vocab") return e.skill === "VOCABULARY";
    if (filter === "grammar") return e.skill === "GRAMMAR";
    return true;
  });

  return (
    <div className="w-full max-w-[800px] mx-auto px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-lg">
      {/* 1. Header Navigation & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
        <Link
          href={`/results/${sessionId}`}
          className="inline-flex items-center gap-space-xs text-primary-container font-medium hover:underline group w-fit text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
          <span>Quay lại kết quả</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium w-fit">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          Mã phiên: {sessionId.slice(0, 8)}...
        </span>
      </div>

      {/* 2. Title & Context Metadata */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
          Xem lại bài thi
        </h1>
        <p className="text-sm text-on-surface-variant">
          Chi tiết từng câu hỏi thích ứng CAT, đối chuẩn đáp án và giải thích chuyên sâu từ AI.
        </p>
      </div>

      {/* 3. Overview Performance Banner (Stitch UI) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md border border-outline-variant/20">
        <div className="flex items-center gap-space-md w-full sm:w-auto">
          <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary-container shrink-0">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-on-surface">
              {entries.length} / {entries.length} Câu
            </div>
            <div className="text-xs text-on-surface-variant">
              Tổng số câu hỏi thích ứng đã hoàn tất
            </div>
          </div>
        </div>

        <div className="flex items-center gap-space-md w-full sm:w-auto justify-start sm:justify-end">
          <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-2 rounded-lg border border-outline-variant/15">
            <CheckCircle className="w-5 h-5 text-secondary" />
            <span className="text-sm font-bold text-on-surface">{correctCount}</span>
            <span className="text-xs text-on-surface-variant">Đúng</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-2 rounded-lg border border-outline-variant/15">
            <XCircle className="w-5 h-5 text-error" />
            <span className="text-sm font-bold text-on-surface">{wrongCount}</span>
            <span className="text-xs text-on-surface-variant">Sai</span>
          </div>
        </div>
      </div>

      {/* 4. Filter Buttons Bar (Stitch UI) */}
      <div
        className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/20"
        data-testid="review-filter"
      >
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filter === "all"
              ? "bg-primary-container text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Tất cả ({entries.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("wrong")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filter === "wrong"
              ? "bg-primary-container text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Chỉ câu sai ({wrongCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("vocab")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filter === "vocab"
              ? "bg-primary-container text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Từ vựng ({vocabCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("grammar")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filter === "grammar"
              ? "bg-primary-container text-white shadow-xs"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          Ngữ pháp ({grammarCount})
        </button>
      </div>

      {/* 5. Question Review List (Stitch UI Accordion) */}
      <div className="flex flex-col gap-space-sm" data-testid="review-list">
        {filteredEntries.map((e, idx) => {
          const entryOrder = typeof e.order === "number" && e.order > 0 ? e.order : idx + 1;
          const isOpen = openItems[entryOrder] ?? (idx === 0);
          const skillLabel = e.skill === "VOCABULARY" ? "Từ vựng" : "Ngữ pháp";

          return (
            <article
              key={`review-${entryOrder}-${idx}`}
              data-testid={`review-item-${entryOrder}`}
              className="bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden transition-all duration-200 border border-outline-variant/30"
            >
              {/* Accordion Header */}
              <header
                onClick={() => toggleAccordion(entryOrder)}
                className="p-space-md sm:p-space-lg flex items-center justify-between cursor-pointer select-none hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="flex items-center gap-space-md min-w-0 pr-2">
                  <span className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center shrink-0">
                    {entryOrder}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 w-fit ${
                        e.skill === "VOCABULARY"
                          ? "bg-surface-container-highest text-primary-container"
                          : "bg-primary-fixed text-primary-container"
                      }`}
                    >
                      {skillLabel}
                    </span>
                    <p className="text-sm font-medium text-on-surface truncate max-w-[280px] sm:max-w-[450px]">
                      {e.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-space-sm shrink-0 ml-2">
                  {e.isCorrect ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container text-xs font-semibold">
                      <Check className="h-3.5 w-3.5" />
                      <span>Đúng</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-semibold">
                      <XCircle className="h-3.5 w-3.5 text-error" />
                      <span>Sai</span>
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-outline" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-outline" />
                  )}
                </div>
              </header>

              {/* Accordion Body */}
              {isOpen && (
                <div className="px-space-md sm:px-space-lg pb-space-lg pt-2 flex flex-col gap-space-md border-t border-outline-variant/15">
                  <div className="text-base font-medium text-on-surface leading-relaxed pt-2">
                    {e.content}
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {OPTION_KEYS.map((key: OptionKey) => {
                      const isChosen = key === e.chosen;
                      const isCorrect = key === e.correct;

                      let containerClass =
                        "p-3.5 sm:p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-outline-variant/15";
                      let badgeClass =
                        "w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant font-bold text-xs flex items-center justify-center shrink-0";
                      let textClass = "text-sm text-on-surface-variant";

                      if (isCorrect && isChosen) {
                        containerClass =
                          "p-3.5 sm:p-4 rounded-xl bg-secondary-container/40 flex items-center justify-between border border-secondary/30";
                        badgeClass =
                          "w-7 h-7 rounded-lg bg-secondary text-on-secondary font-bold text-xs flex items-center justify-center shrink-0";
                        textClass = "text-sm text-on-surface font-semibold";
                      } else if (isCorrect) {
                        containerClass =
                          "p-3.5 sm:p-4 rounded-xl bg-secondary-container/40 flex items-center justify-between border border-secondary/30";
                        badgeClass =
                          "w-7 h-7 rounded-lg bg-secondary text-on-secondary font-bold text-xs flex items-center justify-center shrink-0";
                        textClass = "text-sm text-on-surface font-semibold";
                      } else if (isChosen) {
                        containerClass =
                          "p-3.5 sm:p-4 rounded-xl bg-error-container/40 flex items-center justify-between border border-error/30";
                        badgeClass =
                          "w-7 h-7 rounded-lg bg-error text-on-error font-bold text-xs flex items-center justify-center shrink-0";
                        textClass = "text-sm text-on-surface font-medium";
                      }

                      return (
                        <div key={key} className={containerClass}>
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <span className={badgeClass}>{key}</span>
                            <span className={textClass}>
                              {e.options ? e.options[key] : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {isChosen && (
                              <span
                                data-testid="chosen-mark"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest text-error text-xs font-semibold shadow-xs border border-outline-variant/20"
                              >
                                <User className="h-3 w-3 text-error" />
                                <span>Bạn đã chọn</span>
                              </span>
                            )}
                            {isCorrect && (
                              <span
                                data-testid="correct-mark"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest text-secondary text-xs font-semibold shadow-xs border border-outline-variant/20"
                              >
                                <Check className="h-3 w-3 text-secondary" />
                                <span>Đáp án đúng</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Explanation Block */}
                  <ExplanationPanel entry={e} index={entryOrder} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* 6. Bottom Navigation Footer Link */}
      <div className="pt-space-md pb-space-2xl flex flex-col sm:flex-row items-center justify-between gap-space-md border-t border-outline-variant/30">
        <div className="flex items-center gap-2 text-on-surface-variant text-xs sm:text-sm">
          <BadgeCheck className="w-5 h-5 text-secondary shrink-0" />
          <span>Câu hỏi và giải thích đã được kiểm duyệt bởi giảng viên</span>
        </div>
        <div className="flex items-center gap-3">
          {backBtn}
          <Button
            asChild
            className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-xs"
          >
            <Link href="/history">
              <span>Đến lịch sử bài thi</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
