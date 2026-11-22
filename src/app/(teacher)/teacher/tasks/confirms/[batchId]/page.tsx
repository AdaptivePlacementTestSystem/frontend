"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  getBatchItemsForConfirm,
  confirmTeacherItem,
  removeTeacherItem,
  confirmAllRemainingItems,
} from "@/lib/api/endpoints";
import type { ReviewItemDetail } from "@/lib/api/types";
import { vi } from "@/messages/vi";

export default function BatchConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const batchId = params.batchId as string;
  const itemParam = searchParams.get("item");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["teacher", "tasks", "confirms", batchId],
    queryFn: ({ signal }) => getBatchItemsForConfirm(batchId, signal),
  });

  const items = data?.items || [];
  const batch = data?.batch;

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isConfirmAllOpen, setIsConfirmAllOpen] = useState<boolean>(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState<boolean>(false);
  const [itemToRemoveId, setItemToRemoveId] = useState<string | null>(null);

  // Set initial selected item
  useEffect(() => {
    if (items.length === 0) return;

    if (itemParam) {
      const idx = items.findIndex((it) => it.id === itemParam);
      if (idx !== -1) {
        setSelectedIndex(idx);
        return;
      }
    }

    // Default to first undecided (FIRST_APPROVED) item
    const firstUndecided = items.findIndex((it) => it.status === "FIRST_APPROVED");
    setSelectedIndex(firstUndecided !== -1 ? firstUndecided : 0);
  }, [items, itemParam]);

  const currentItem: ReviewItemDetail | undefined = items[selectedIndex];

  // Stats
  const undecidedCount = useMemo(
    () => items.filter((it) => it.status === "FIRST_APPROVED").length,
    [items],
  );
  const decidedCount = items.length - undecidedCount;
  const isAllDecided = items.length > 0 && undecidedCount === 0;

  // Jump to next undecided
  const advanceToNext = (startIndex: number) => {
    const nextUndecided = items.findIndex(
      (it, idx) => idx > startIndex && it.status === "FIRST_APPROVED",
    );
    if (nextUndecided !== -1) {
      setSelectedIndex(nextUndecided);
    } else {
      const anyUndecided = items.findIndex((it) => it.status === "FIRST_APPROVED");
      if (anyUndecided !== -1) {
        setSelectedIndex(anyUndecided);
      }
    }
  };

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return confirmTeacherItem(itemId);
    },
    onSuccess: () => {
      toast.success(vi.tasks.confirmSuccess);
      queryClient.invalidateQueries({ queryKey: ["teacher", "tasks", "confirms"] });
      advanceToNext(selectedIndex);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lỗi khi xác nhận câu hỏi.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return removeTeacherItem(itemId);
    },
    onSuccess: () => {
      toast.success(vi.tasks.removeSuccess);
      setIsRemoveDialogOpen(false);
      setItemToRemoveId(null);
      queryClient.invalidateQueries({ queryKey: ["teacher", "tasks", "confirms"] });
      advanceToNext(selectedIndex);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lỗi khi loại bỏ câu hỏi.");
    },
  });

  const confirmAllMutation = useMutation({
    mutationFn: async () => {
      return confirmAllRemainingItems(batchId);
    },
    onSuccess: (res) => {
      toast.success(res?.message || vi.tasks.confirmAllSuccess);
      setIsConfirmAllOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teacher", "tasks", "confirms"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lỗi khi xác nhận tất cả.");
    },
  });

  if (isPending) return <LoadingBlock />;
  if (isError) return <ErrorBlock error={error} onRetry={() => refetch()} />;
  if (!items || items.length === 0) {
    return <EmptyBlock text="Lô này chưa có câu hỏi nào cần thẩm định cho bạn." />;
  }

  const isCurrentUndecided = currentItem?.status === "FIRST_APPROVED";
  const dueAt = currentItem?.secondReview?.dueAt;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b" data-testid="confirm-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/tasks/confirms"
              className="text-sm font-medium text-muted-foreground hover:text-foreground underline"
            >
              ← Quay lại Hộp việc
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Thẩm định lô: {batch?.name || batchId}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold">
              {vi.tasks.processedProgress} {decidedCount} / {items.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Còn {undecidedCount} câu cần thẩm định
            </p>
          </div>
          <DueBadge dueAt={dueAt} />

          {/* Confirm All Remaining Button */}
          <Button
            variant="outline"
            className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold"
            disabled={undecidedCount === 0 || confirmAllMutation.isPending}
            onClick={() => setIsConfirmAllOpen(true)}
            data-testid="confirm-all"
          >
            {vi.tasks.confirmAll} ({undecidedCount})
          </Button>
        </div>
      </div>

      {/* Done Banner */}
      {isAllDecided && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900" data-testid="confirm-done">
          <AlertDescription className="font-semibold text-sm flex items-center gap-2">
            <span>✓</span> {vi.tasks.allDone}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Split-view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Item List (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Danh sách câu hỏi ({items.length})
          </h2>
          <div
            className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1"
            data-testid="confirm-items"
          >
            {items.map((it, idx) => {
              const isSelected = idx === selectedIndex;
              const isEdited = it.hasEdited || !!it.firstReview?.originalSnapshot;
              const hasFlags = it.flags && it.flags.length > 0;
              const isUndecided = it.status === "FIRST_APPROVED";

              return (
                <div
                  key={it.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm font-medium"
                      : "border-border hover:bg-muted/50"
                  }`}
                  data-testid={`confirm-row-${it.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-xs text-muted-foreground">
                          #{idx + 1}
                        </span>

                        {it.status === "SECOND_APPROVED" ? (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] py-0 px-1">
                            ✓ Đã xác nhận
                          </Badge>
                        ) : it.status === "REJECTED" ? (
                          <Badge variant="outline" className="text-red-700 bg-red-50 border-red-300 text-[10px] py-0 px-1">
                            ✕ Đã loại
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300 text-[10px] py-0 px-1">
                            • Chờ xác nhận
                          </Badge>
                        )}

                        {isEdited && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] py-0 px-1 font-semibold"
                            data-testid={`item-edited-flag-${it.id}`}
                          >
                            {vi.tasks.teacherAEdited}
                          </Badge>
                        )}

                        {hasFlags && (
                          <span className="text-amber-600 font-bold text-xs" title="Có cờ cảnh báo mềm">
                            (!)
                          </span>
                        )}
                      </div>

                      <p className="text-xs truncate text-muted-foreground">
                        {it.content}
                      </p>

                      <p className="text-[11px] text-muted-foreground/80">
                        {vi.tasks.reviewerLabel} {it.reviewerName || "GV A"}
                      </p>
                    </div>

                    {isSelected && <span className="text-primary font-bold">◄</span>}
                  </div>

                  {/* Quick action buttons on list row */}
                  {isUndecided && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border/40">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToRemoveId(it.id);
                          setIsRemoveDialogOpen(true);
                        }}
                        data-testid={`remove-item-${it.id}`}
                      >
                        Loại bỏ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        disabled={confirmMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmMutation.mutate(it.id);
                        }}
                        data-testid={`confirm-item-${it.id}`}
                      >
                        Xác nhận
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Read-Only Detail & Diff (7 cols) */}
        {currentItem && (
          <div className="lg:col-span-7 space-y-4" data-testid="diff-view">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span>Thẩm định câu #{selectedIndex + 1} / {items.length}</span>
                    {currentItem.hasEdited && (
                      <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-xs">
                        {vi.tasks.teacherAEdited}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === 0}
                    onClick={() => setSelectedIndex((prev) => prev - 1)}
                  >
                    ← Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex === items.length - 1}
                    onClick={() => setSelectedIndex((prev) => prev + 1)}
                  >
                    Sau →
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Flags if any */}
                <SoftFlags flags={currentItem.flags} />

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-md bg-muted/40 text-xs text-muted-foreground border">
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
                  <div>
                    <span className="font-semibold text-foreground">GV duyệt (vòng 1):</span>{" "}
                    {currentItem.reviewerName || "GV A"}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Trạng thái:</span>{" "}
                    {currentItem.status}
                  </div>
                </div>

                {/* Question View: C-DIFF if edited, or standard read-only view */}
                {currentItem.hasEdited || currentItem.firstReview?.originalSnapshot ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Bản so sánh đối chiếu C-DIFF (Bản gốc vs Bản A đã sửa):
                    </p>
                    <DiffViewer
                      original={currentItem.firstReview?.originalSnapshot}
                      current={{
                        content: currentItem.content,
                        options: currentItem.options,
                        correctAnswer: currentItem.correctAnswer,
                        explanation: currentItem.explanation,
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-lg border bg-card text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Nội dung câu hỏi:
                      </p>
                      <p className="font-medium p-2 bg-muted/30 rounded border">
                        {currentItem.content}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Các phương án:</p>
                      <div className="space-y-1.5">
                        {(["A", "B", "C", "D"] as const).map((opt) => (
                          <div
                            key={opt}
                            className={`p-2 rounded border text-xs flex items-center gap-2 ${
                              currentItem.correctAnswer === opt
                                ? "border-emerald-300 bg-emerald-50/50 font-semibold text-emerald-900"
                                : "bg-muted/20"
                            }`}
                          >
                            <span className="font-bold">{opt}.</span>
                            <span className="flex-1">{currentItem.options[opt]}</span>
                            {currentItem.correctAnswer === opt && (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-400 bg-emerald-50 text-[10px] py-0 px-1">
                                Đáp án đúng
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Giải thích:
                      </p>
                      <p className="text-xs p-2 bg-muted/30 rounded border text-muted-foreground">
                        {currentItem.explanation || "(Không có giải thích)"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons at bottom */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  {isCurrentUndecided ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setItemToRemoveId(currentItem.id);
                          setIsRemoveDialogOpen(true);
                        }}
                      >
                        Loại bỏ câu hỏi
                      </Button>
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        disabled={confirmMutation.isPending}
                        onClick={() => confirmMutation.mutate(currentItem.id)}
                      >
                        {confirmMutation.isPending ? "Đang xác nhận..." : "Xác nhận câu hỏi"}
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground py-1.5 px-3 text-xs">
                      Câu hỏi đã có quyết định thẩm định ({currentItem.status})
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dialog: Remove confirmation (no reason required) */}
            <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{vi.tasks.removeConfirmTitle}</DialogTitle>
                  <DialogDescription>
                    {vi.tasks.removeConfirmDesc}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRemoveDialogOpen(false);
                      setItemToRemoveId(null);
                    }}
                  >
                    {vi.tasks.cancel}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (itemToRemoveId) {
                        removeMutation.mutate(itemToRemoveId);
                      }
                    }}
                  >
                    {removeMutation.isPending ? "Đang loại..." : "Loại bỏ"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Confirm All Remaining */}
            <Dialog open={isConfirmAllOpen} onOpenChange={setIsConfirmAllOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{vi.tasks.confirmAllTitle}</DialogTitle>
                  <DialogDescription>
                    Toàn bộ {undecidedCount} câu hỏi đang chờ xác nhận trong lô này sẽ được duyệt đạt và chuyển sang trạng thái Đã xác nhận (SECOND_APPROVED). Thao tác này sẽ ghi nhận log kiểm toán CONFIRM_ALL.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setIsConfirmAllOpen(false)}
                  >
                    {vi.tasks.cancel}
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    disabled={confirmAllMutation.isPending}
                    onClick={() => confirmAllMutation.mutate()}
                  >
                    {confirmAllMutation.isPending ? "Đang xử lý..." : "Xác nhận tất cả"}
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
