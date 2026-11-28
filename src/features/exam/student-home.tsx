"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getActiveSession, getStudentExamRounds } from "@/lib/api/endpoints";
import { vi } from "@/messages/vi";
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Calendar,
  Layers,
} from "lucide-react";

export function StudentHome() {
  const activeQuery = useQuery({
    queryKey: ["active-session"],
    queryFn: ({ signal }) => getActiveSession(signal),
  });

  const roundsQuery = useQuery({
    queryKey: ["student-exam-rounds"],
    queryFn: ({ signal }) => getStudentExamRounds(signal),
  });

  if (activeQuery.isPending || roundsQuery.isPending) {
    return <LoadingBlock />;
  }

  if (activeQuery.isError && roundsQuery.isError) {
    return (
      <ErrorBlock
        error={activeQuery.error}
        onRetry={() => {
          activeQuery.refetch();
          roundsQuery.refetch();
        }}
      />
    );
  }

  const session = activeQuery.data?.session;
  const closed = activeQuery.data?.closedPrevious;
  const rounds = roundsQuery.data ?? [];

  return (
    <div className="w-full max-w-[720px] mx-auto px-margin-mobile sm:px-margin py-8 sm:py-10 space-y-8">
      {/* 0. Header Greeting theo Stitch UI */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">
          Cổng thông tin sinh viên
        </h1>
        <p className="text-sm text-on-surface-variant">
          Chọn kỳ thi đang mở để tham gia khảo sát và kiểm tra xếp lớp tiếng Anh thích ứng (CAT).
        </p>
      </header>

      {/* Thông báo nếu phiên thi trước vừa bị đóng do quá hạn */}
      {closed && (
        <Alert
          data-testid="closed-previous"
          className="border-amber-500/30 bg-amber-500/10 text-amber-900 rounded-xl"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="ml-2 flex items-center justify-between">
            <span>
              {closed.status === "ABANDONED" ? vi.home.closedAbandoned : vi.home.closedCompleted}
            </span>
            {closed.status === "COMPLETED" && (
              <Button asChild variant="link" size="sm" className="font-semibold underline">
                <Link href={`/student/results/${closed.sessionId}`}>{vi.exam.viewResult}</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Resume Banner: Màn hình S02 - Banner làm tiếp bài thi dở dang */}
      {session && (
        <section
          data-testid="resume-banner"
          className="rounded-xl p-5 sm:p-6 bg-[#FFFBEB] border-[1.5px] border-[#F59E0B] shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
                  Đang diễn ra
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#78350F]">
                Bạn đang có một bài thi chưa hoàn thành!
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#92400E]">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã hoàn thành {session.itemCount} / {session.maxItems} câu
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Hết hạn lúc:{" "}
                  {new Date(session.expiresAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <div className="shrink-0 pt-2 sm:pt-0">
              <Button
                asChild
                size="lg"
                data-testid="resume-banner-button"
                className="w-full sm:w-auto h-12 px-6 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-semibold shadow-sm transition-colors"
              >
                <Link href={`/student/exams/${session.examRoundId ?? session.sessionId}/take`}>
                  <span>Tiếp tục bài thi</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 2. My Exam Rounds Section: Danh sách kỳ thi của tôi */}
      <section data-testid="my-rounds" className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-bold text-on-surface">Kỳ thi của tôi</h2>
          <span className="text-xs font-semibold text-on-surface-variant">
            {rounds.length} đợt khảo thí
          </span>
        </div>

        {roundsQuery.isError ? (
          <ErrorBlock error={roundsQuery.error} onRetry={() => roundsQuery.refetch()} />
        ) : rounds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-lowest p-8 text-center text-on-surface-variant">
            <Layers className="mx-auto mb-2 h-8 w-8 text-outline" />
            <p className="font-medium">Bạn chưa được phân công vào đợt thi nào.</p>
            <p className="text-xs text-outline mt-1">
              Vui lòng liên hệ quản trị viên hoặc phòng đào tạo nếu bạn cần tham gia khảo sát.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rounds.map((round, idx) => {
              const isOpen = round.effectiveStatus === "OPEN";
              const isScheduled = round.effectiveStatus === "SCHEDULED";
              const isCompleted = round.sessionStatus === "COMPLETED";
              const isInProgress = round.sessionStatus === "IN_PROGRESS";

              return (
                <article
                  key={round.id}
                  data-testid={`round-card-${idx + 1}`}
                  className="rounded-xl border border-outline-variant/30 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isCompleted ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                            Đã thi {round.scoreCefr ? `• CEFR ${round.scoreCefr}` : ""}
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                            Đang làm dở
                          </span>
                        ) : isOpen ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            Đang mở
                          </span>
                        ) : isScheduled ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            Chưa mở
                          </span>
                        ) : (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            Đã đóng
                          </span>
                        )}
                        <span className="text-xs text-on-surface-variant font-medium">
                          CAT • Mô hình Rasch 1PL
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-on-surface">{round.title}</h3>

                      <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <Calendar className="h-3.5 w-3.5 text-outline" />
                        <span>
                          {new Date(round.opensAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {new Date(round.closesAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}{" "}
                          • {round.durationMinutes} phút • Tối đa 25 câu
                        </span>
                      </p>
                    </div>

                    <div className="shrink-0 pt-2 sm:pt-0">
                      {isCompleted && round.sessionId ? (
                        <Button
                          asChild
                          variant="outline"
                          data-testid="view-result"
                          className="w-full sm:w-auto h-11 px-5 rounded-lg border-primary text-primary hover:bg-primary/5 font-semibold"
                        >
                          <Link href={`/student/results/${round.sessionId}`}>
                            <span>Xem kết quả</span>
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : isInProgress ? (
                        <Button
                          asChild
                          data-testid="resume-exam"
                          className="w-full sm:w-auto h-11 px-5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                          <Link href={`/student/exams/${round.id}/take`}>
                            <span>Tiếp tục làm bài</span>
                            <PlayCircle className="ml-1.5 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : isOpen ? (
                        <Button
                          asChild
                          data-testid="start-exam"
                          className="w-full sm:w-auto h-11 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                        >
                          <Link href={`/student/exams/${round.id}`}>
                            <span>Bắt đầu bài thi</span>
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          disabled
                          variant="ghost"
                          className="w-full sm:w-auto h-11 px-5 rounded-lg bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
                        >
                          {isScheduled ? "Chưa đến giờ" : "Đã kết thúc"}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
