"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { DueBadge } from "@/components/review/due-badge";
import { SoftFlags } from "@/components/review/soft-flags";
import { DiffViewer } from "@/components/review/diff-viewer";
import {
  getBatchItemsForReview,
  editTeacherItem,
  approveTeacherItem,
  rejectTeacherItem,
} from "@/lib/api/endpoints";
import type { ReviewItemDetail, ReviewOptionMap } from "@/lib/api/types";
import { vi } from "@/messages/vi";

export default function BatchReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const batchId = params.batchId as string;
  const itemParam = searchParams.get("item");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["teacher", "tasks", "reviews", batchId],
    queryFn: ({ signal }) => getBatchItemsForReview(batchId, signal),
  });

  const items = data?.items || [];
  const batch = data?.batch;

  // Selected item index
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Form state for current item
  const [content, setContent] = useState<string>("");
  const [options, setOptions] = useState<ReviewOptionMap>({ A: "", B: "", C: "", D: "" });
  const [correctAnswer, setCorrectAnswer] = useState<string>("A");
  const [explanation, setExplanation] = useState<string>("");

  // Edit validation / error states
  const [editError, setEditError] = useState<string | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState<boolean>(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState<boolean>(false);

  // Set initial selected item when items load or query param changes
  useEffect(() => {
    if (items.length === 0) return;

    if (itemParam) {
      const idx = items.findIndex((it) => it.id === itemParam);
      if (idx !== -1) {
        setSelectedIndex(idx);
        return;
      }
    }

    // Default to the first undecided (DRAFT) item, or item 0
    const firstUndecided = items.findIndex((it) => it.status === "DRAFT");
    setSelectedIndex(firstUndecided !== -1 ? firstUndecided : 0);
  }, [items, itemParam]);

  const currentItem: ReviewItemDetail | undefined = items[selectedIndex];

  // Sync form state when selectedItem changes
  useEffect(() => {
    if (!currentItem) return;
    setContent(currentItem.content);
    setOptions({
      A: currentItem.options.A || "",
      B: currentItem.options.B || "",
      C: currentItem.options.C || "",
      D: currentItem.options.D || "",
    });
    setCorrectAnswer(currentItem.correctAnswer || "A");
    setExplanation(currentItem.explanation || "");
    setEditError(null);
  }, [currentItem]);

  // Check if form has unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    if (!currentItem) return false;
    return (
      content.trim() !== currentItem.content.trim() ||
      options.A.trim() !== (currentItem.options.A || "").trim() ||
      options.B.trim() !== (currentItem.options.B || "").trim() ||
      options.C.trim() !== (currentItem.options.C || "").trim() ||
      options.D.trim() !== (currentItem.options.D || "").trim() ||
      correctAnswer !== currentItem.correctAnswer ||
      explanation.trim() !== (currentItem.explanation || "").trim()
    );
  }, [currentItem, content, options, correctAnswer, explanation]);

  // Stats
  const decidedCount = useMemo(
    () => items.filter((it) => it.status === "FIRST_APPROVED" || it.status === "REJECTED").length,
    [items],
  );

  // Jump to next undecided question
  const advanceToNext = (startIndex: number) => {
    const nextUndecided = items.findIndex(
      (it, idx) => idx > startIndex && it.status === "DRAFT",
    );
    if (nextUndecided !== -1) {
      setSelectedIndex(nextUndecided);
    } else {
      const anyUndecided = items.findIndex((it) => it.status === "DRAFT");
      if (anyUndecided !== -1) {
        setSelectedIndex(anyUndecided);
      } else if (startIndex + 1 < items.length) {
        setSelectedIndex(startIndex + 1);
      }
    }
  };

  // Mutations
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!currentItem) return;
      return editTeacherItem(currentItem.id, {
        content: content.trim(),
        options: {
          A: options.A.trim(),
          B: options.B.trim(),
          C: options.C.trim(),
          D: options.D.trim(),
        },
        correctAnswer,
        explanation: explanation.trim(),
      });
    },
    onSuccess: () => {
      toast.success(vi.tasks.saveSuccess);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ["teacher", "tasks", "reviews"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Lỗi khi lưu chỉnh sửa câu hỏi.";
      setEditError(msg);
      toast.error(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!currentItem) return;
      return approveTeacherItem(currentItem.id);
    },
    onSuccess: () => {
      toast.success(vi.tasks.approveSuccess);
      queryClient.invalidateQueries({ queryKey: ["teacher", "tasks", "reviews"] });
      advanceToNext(selectedIndex);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lỗi khi duyệt câu hỏi.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!currentItem) return;
      return rejectTeacherItem(currentItem.id);
    },
    onSuccess: () => {
      toast.success(vi.tasks.rejectSuccess);
      setIsRejectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teacher", "tasks", "reviews"] });
      advanceToNext(selectedIndex);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lỗi khi từ chối câu hỏi.");
    },
  });

  if (isPending) return <LoadingBlock />;
  if (isError) return <ErrorBlock error={error} onRetry={() => refetch()} />;
  if (!items || items.length === 0) {
    return <EmptyBlock text="Lô này chưa có câu hỏi nào được phân công cho bạn." />;
  }

  const isCurrentDraft = currentItem?.status === "DRAFT";
  const dueAt = currentItem?.firstReview?.dueAt;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/tasks/reviews"
              className="text-sm font-medium text-muted-foreground hover:text-foreground underline"
            >
              ← Quay lại Hộp việc
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Lô: {batch?.name || batchId}
          </h1>
        </div>

        <div className="flex items-center gap-4" data-testid="review-progress">
          <div className="text-right">
            <p className="text-sm font-semibold">
              {vi.tasks.decidedProgress} {decidedCount} / {items.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Còn {items.length - decidedCount} câu chưa quyết
            </p>
          </div>
          <DueBadge dueAt={dueAt} />
        </div>
      </div>

      {/* Main Split-view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Item List (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Danh sách câu hỏi ({items.length})
          </h2>
          <div
            className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1"
            data-testid="review-list"
          >
            {items.map((it, idx) => {
              const isSelected = idx === selectedIndex;
              const hasFlags = it.flags && it.flags.length > 0;
              const isEdited = it.hasEdited || !!it.firstReview?.originalSnapshot;

              return (
                <button
                  key={it.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm font-medium"
                      : "border-border hover:bg-muted/50"
                  }`}
                  data-testid={`review-item-row-${it.id}`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-muted-foreground">
                        #{idx + 1}
                      </span>
                      {it.status === "FIRST_APPROVED" ? (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] py-0 px-1">
                          ✓ Đã duyệt
                        </Badge>
                      ) : it.status === "REJECTED" ? (
                        <Badge variant="outline" className="text-red-700 bg-red-50 border-red-300 text-[10px] py-0 px-1">
                          ✕ Đã từ chối
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-[10px] py-0 px-1">
                          • Chưa quyết
                        </Badge>
                      )}

                      {hasFlags && (
                        <span className="text-amber-600 font-bold text-xs" title="Có cờ cảnh báo mềm">
                          (!)
                        </span>
                      )}

                      {isEdited && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1">
                          đã sửa
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs truncate text-muted-foreground">
                      {it.content}
                    </p>
                  </div>
                  {isSelected && <span className="text-primary font-bold">◄</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Item Detail & Action Form (8 cols) */}
        {currentItem && (
          <div className="lg:col-span-8 space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span>Câu hỏi #{selectedIndex + 1} / {items.length}</span>
                    <span className="font-mono text-xs text-muted-foreground font-normal">
                      (ID: {currentItem.id})
                    </span>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === 0}
                    onClick={() => setSelectedIndex((prev) => prev - 1)}
                    data-testid="review-prev"
                  >
                    ← Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === items.length - 1}
                    onClick={() => setSelectedIndex((prev) => prev + 1)}
                    data-testid="review-next"
                  >
                    Sau →
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Soft Flags Warning */}
                <SoftFlags flags={currentItem.flags} />

                {/* Edit Error Alert if any */}
                {editError && (
                  <Alert variant="destructive" className="border-red-300">
                    <AlertDescription className="text-sm">
                      Lỗi kiểm tra bản sửa: {editError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Metadata (Read-only) */}
                <div
                  className="flex flex-wrap items-center gap-3 p-2.5 rounded-md bg-muted/40 text-xs text-muted-foreground border"
                  data-testid="review-meta"
                >
                  <div>
                    <span className="font-semibold text-foreground">Kỹ năng:</span>{" "}
                    {currentItem.skill}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Mức CEFR:</span>{" "}
                    {currentItem.cefrTarget}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Độ khó IRT (b):</span>{" "}
                    {currentItem.irtB?.toFixed(2)}
                  </div>
                  {currentItem.topicTag && (
                    <div>
                      <span className="font-semibold text-foreground">Chủ đề:</span>{" "}
                      {currentItem.topicTag}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-foreground">Trạng thái:</span>{" "}
                    {currentItem.status}
                  </div>
                </div>

                {/* Question Content */}
                <div className="space-y-1.5">
                  <Label htmlFor="review-content" className="text-sm font-semibold">
                    Nội dung câu hỏi *
                  </Label>
                  <Textarea
                    id="review-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!isCurrentDraft}
                    className="min-h-[80px]"
                    data-testid="review-content"
                  />
                </div>

                {/* 4 Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Các phương án lựa chọn *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["A", "B", "C", "D"] as const).map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <span className="font-bold text-sm w-4">{opt}.</span>
                        <Input
                          value={options[opt]}
                          onChange={(e) =>
                            setOptions((prev) => ({ ...prev, [opt]: e.target.value }))
                          }
                          disabled={!isCurrentDraft}
                          placeholder={`Phương án ${opt}`}
                          data-testid={`review-option-${opt}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correct Answer */}
                <div className="space-y-1.5" data-testid="review-correct">
                  <Label className="text-sm font-semibold">Đáp án đúng *</Label>
                  <RadioGroup
                    value={correctAnswer}
                    onValueChange={(val) => setCorrectAnswer(val)}
                    disabled={!isCurrentDraft}
                    className="flex items-center gap-6 pt-1"
                  >
                    {(["A", "B", "C", "D"] as const).map((opt) => (
                      <div key={opt} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`answer-${opt}`} />
                        <Label htmlFor={`answer-${opt}`} className="font-bold cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <Label htmlFor="review-explanation" className="text-sm font-semibold">
                    Giải thích đáp án *
                  </Label>
                  <Textarea
                    id="review-explanation"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    disabled={!isCurrentDraft}
                    placeholder="Giải thích tại sao đáp án đúng..."
                    className="min-h-[70px]"
                    data-testid="review-explanation"
                  />
                </div>

                {/* Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {/* View Original (Diff) Button */}
                    {(currentItem.hasEdited || currentItem.firstReview?.originalSnapshot) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDiffOpen(true)}
                        data-testid="review-view-original"
                      >
                        {vi.tasks.viewOriginal}
                      </Button>
                    )}

                    {/* Save Edit Button */}
                    {isCurrentDraft && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!hasUnsavedChanges || editMutation.isPending}
                        onClick={() => editMutation.mutate()}
                        data-testid="review-save"
                      >
                        {editMutation.isPending ? "Đang lưu..." : vi.tasks.saveEdit}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reject Button */}
                    {isCurrentDraft && (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        size="sm"
                        onClick={() => setIsRejectDialogOpen(true)}
                        data-testid="review-reject"
                      >
                        Từ chối
                      </Button>
                    )}

                    {/* Approve Button */}
                    {isCurrentDraft && (
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        size="sm"
                        disabled={
                          hasUnsavedChanges ||
                          !!editError ||
                          approveMutation.isPending
                        }
                        onClick={() => approveMutation.mutate()}
                        data-testid="review-approve"
                      >
                        {approveMutation.isPending ? "Đang duyệt..." : "Duyệt câu hỏi"}
                      </Button>
                    )}

                    {!isCurrentDraft && (
                      <Badge variant="outline" className="text-muted-foreground py-1 px-3">
                        Câu đã được quyết định ({currentItem.status})
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dialog: Reject confirmation (no reason required) */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{vi.tasks.rejectConfirmTitle}</DialogTitle>
                  <DialogDescription>
                    {vi.tasks.rejectConfirmDesc}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setIsRejectDialogOpen(false)}
                  >
                    {vi.tasks.cancel}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate()}
                  >
                    {rejectMutation.isPending ? "Đang xử lý..." : "Từ chối"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: View Original Diff */}
            <Dialog open={isDiffOpen} onOpenChange={setIsDiffOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>So sánh với bản gốc (C-DIFF)</DialogTitle>
                  <DialogDescription>
                    Đối chiếu nội dung bản gốc (Import / AI) và bản chỉnh sửa hiện tại của GV A.
                  </DialogDescription>
                </DialogHeader>
                <DiffViewer
                  original={currentItem.firstReview?.originalSnapshot}
                  current={{
                    content: currentItem.content,
                    options: currentItem.options,
                    correctAnswer: currentItem.correctAnswer,
                    explanation: currentItem.explanation,
                  }}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDiffOpen(false)}>
                    Đóng
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
