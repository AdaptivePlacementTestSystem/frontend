"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { ApiError } from "@/lib/api/errors";
import { getStudentProfile } from "@/lib/api/endpoints";
import { ResultCard } from "@/features/result/result-card";
import { ReviewView } from "@/features/result/review-view";
import { vi } from "@/messages/vi";
import {
  ArrowLeft,
  Printer,
  Mail,
  History,
  CheckCircle2,
  AlertTriangle,
  User,
  FileEdit,
  Save,
  GraduationCap,
  Eye,
  FileText,
} from "lucide-react";

interface StudentProfileViewProps {
  studentId: string;
}

export function StudentProfileView({ studentId }: StudentProfileViewProps) {
  const [academicNote, setAcademicNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["profile", studentId],
    queryFn: ({ signal }) => getStudentProfile(studentId, signal),
    retry: false,
  });

  const notFound =
    q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);

  const handleSaveNote = () => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  };

  const getRecommendedPathway = (cefr?: string | null) => {
    switch (cefr) {
      case "PRE_A1":
        return "English Foundation Pre-A1";
      case "A1":
        return "General English A1 (Beginner)";
      case "A2":
        return "Pre-Intermediate English A2";
      case "B1":
        return "Intermediate English B1";
      case "B2":
        return "English Academic Pathway B2";
      case "C1_PLUS":
        return "Advanced Academic & Professional C1+";
      default:
        return "Đang chờ phân loại";
    }
  };

  if (q.isLoading) {
    return (
      <div className="max-w-[1120px] mx-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/teacher/students"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{vi.students.backToLookup}</span>
          </Link>
        </div>
        <LoadingBlock rows={6} />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="max-w-[1120px] mx-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/teacher/students"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{vi.students.backToLookup}</span>
          </Link>
        </div>
        {notFound ? (
          <Alert variant="destructive" className="rounded-xl border shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-base font-medium">
              {vi.students.notFoundStudent} ({studentId})
            </AlertDescription>
          </Alert>
        ) : (
          <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
        )}
      </div>
    );
  }

  const { student, latest, history } = q.data!;
  const initials =
    student.fullName
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "SV";

  return (
    <div className="max-w-[1120px] mx-auto py-6 space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Action Bar & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/teacher/students"
          data-testid="back-to-lookup"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{vi.students.backToLookup}</span>
        </Link>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 shadow-sm rounded-xl"
            type="button"
          >
            <Printer className="h-4 w-4 text-muted-foreground" />
            <span>Xuất phiếu báo</span>
          </Button>
          <Button
            size="sm"
            className="gap-2 shadow-sm rounded-xl"
            type="button"
            onClick={() => {
              if (student.email) {
                window.location.href = `mailto:${student.email}?subject=Tư vấn học thuật bài thi CAT`;
              }
            }}
          >
            <Mail className="h-4 w-4" />
            <span>Gửi tư vấn học thuật</span>
          </Button>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className="text-2xl font-bold tracking-tight text-foreground"
                data-testid="student-profile-name"
              >
                {student.fullName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Đang theo học
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>
                MSSV:{" "}
                <strong className="font-semibold text-foreground font-mono">
                  {student.studentCode}
                </strong>
              </span>
              <span>•</span>
              <span>{student.email || "Chưa cập nhật email"}</span>
              <span>•</span>
              <span>
                Lớp: <strong className="font-semibold text-foreground">K2026-CNTT</strong>
              </span>
              <span>•</span>
              <span>Khoa: Công nghệ thông tin</span>
            </div>
          </div>
        </div>

        {/* Quick Metrics Summary on Profile */}
        <div className="flex items-center gap-6 w-full lg:w-auto pt-2 lg:pt-0 justify-between lg:justify-end bg-muted/40 lg:bg-transparent p-4 lg:p-0 rounded-xl">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {vi.students.evaluationHistory}
            </p>
            <p className="text-base font-bold text-primary font-mono">
              {vi.students.catSessionsCount(history.length)}
            </p>
          </div>
          <div className="w-px h-8 bg-border hidden lg:block" />
          <div className="text-right lg:text-left">
            <p className="text-xs font-medium text-muted-foreground">
              {vi.students.learningPathway}
            </p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {getRecommendedPathway(latest?.cefrLevel)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {latest ? (
        <div className="space-y-8">
          {/* Section 1: CEFR Placement & Rasch Theta Metric Panel */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span>Kết quả khảo thí gần nhất</span>
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs rounded-lg h-8"
                  type="button"
                  onClick={() => setReviewSessionId(latest.sessionId)}
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Xem chi tiết đáp án</span>
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {latest.completedAt ? new Date(latest.completedAt).toLocaleString("vi-VN") : ""}
                </span>
              </div>
            </div>
            <ResultCard
              result={latest}
              onOpenReview={(sid) => setReviewSessionId(sid)}
              showBackHome={false}
            />
          </div>

          {/* Section 2: History of CAT Assessment Sessions */}
          <div
            className="bg-card border rounded-2xl p-6 shadow-sm space-y-4"
            data-testid="history-table"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg text-foreground">{vi.students.catHistory}</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Tổng cộng: {history.length} phiên thi
              </span>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày thi</TableHead>
                      <TableHead>Kỳ thi / Mục đích</TableHead>
                      <TableHead className="text-center">Số câu CAT</TableHead>
                      <TableHead className="text-center">Trình độ CEFR</TableHead>
                      <TableHead className="text-center">Năng lực (Rasch θ ± SE)</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.sessionId} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          {row.completedAt
                            ? new Date(row.completedAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {(row as { examRoundName?: string }).examRoundName ||
                                row.examRoundTitle ||
                                "Kỳ thi Xếp lớp Tiếng Anh"}
                            </span>
                            <span className="text-xs text-muted-foreground">Khảo sát năng lực</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {row.itemsAdministered} câu
                        </TableCell>
                        <TableCell className="text-center">
                          {row.cefrLevel ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              {vi.cefrLevel[row.cefrLevel] || row.cefrLevel}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {row.theta !== undefined && row.theta !== null
                            ? `${row.theta >= 0 ? "+" : ""}${row.theta.toFixed(2)} (±${(row.standardError ?? 0).toFixed(2)})`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {row.status ? vi.sessionStatus[row.status] || row.status : "Hoàn thành"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary hover:text-primary gap-1"
                            type="button"
                            onClick={() => setReviewSessionId(row.sessionId)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem vết thi</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Chưa có lịch sử làm bài thi nào.
              </p>
            )}
          </div>

          {/* Section 3: Academic Notes & Reviewer Comments */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileEdit className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg text-foreground">{vi.students.academicNotes}</h3>
            </div>
            <div className="space-y-4">
              <textarea
                className="w-full rounded-xl border bg-muted/20 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-y"
                placeholder="Nhập ghi chú sư phạm, nhận xét điểm mạnh/yếu hoặc định hướng tư vấn xếp lớp cho sinh viên..."
                value={academicNote}
                onChange={(e) => setAcademicNote(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs text-muted-foreground">
                  Ghi chú nội bộ cho giảng viên phụ trách khoa / bộ môn ngoại ngữ.
                </span>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {noteSaved && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4" />
                      {vi.students.noteSaved}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={handleSaveNote}
                  >
                    <Save className="h-4 w-4" />
                    <span>{vi.students.saveNote}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Alert data-testid="no-profile-alert" className="rounded-xl border">
          <User className="h-4 w-4" />
          <AlertDescription className="text-base font-medium">
            {vi.students.noProfile}
          </AlertDescription>
        </Alert>
      )}
      {/* Dialog xem vết thi / giải thích chi tiết đáp án cho Giảng viên */}
      {reviewSessionId && (
        <Dialog open={!!reviewSessionId} onOpenChange={(open) => !open && setReviewSessionId(null)}>
          <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                <span>Chi tiết câu hỏi & giải thích đáp án bài thi CAT</span>
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <ReviewView sessionId={reviewSessionId} embedded={true} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
