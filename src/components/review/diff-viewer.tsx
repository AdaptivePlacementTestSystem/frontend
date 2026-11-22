"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OriginalSnapshot, ReviewOptionMap } from "@/lib/api/types";

interface DiffViewerProps {
  original?: OriginalSnapshot | null;
  current: {
    content: string;
    options: ReviewOptionMap;
    correctAnswer: string;
    explanation?: string | null;
  };
}

export function DiffViewer({ original, current }: DiffViewerProps) {
  if (!original) {
    return (
      <div className="p-4 rounded-md border border-dashed text-center text-muted-foreground text-sm">
        Câu hỏi này chưa qua chỉnh sửa (nội dung hiện tại là bản gốc từ lô).
      </div>
    );
  }

  const isContentChanged = original.content.trim() !== current.content.trim();
  const isAChanged = original.options.A.trim() !== current.options.A.trim();
  const isBChanged = original.options.B.trim() !== current.options.B.trim();
  const isCChanged = original.options.C.trim() !== current.options.C.trim();
  const isDChanged = original.options.D.trim() !== current.options.D.trim();
  const isAnswerChanged = original.correctAnswer.trim() !== current.correctAnswer.trim();
  const isExplanationChanged = (original.explanation || "").trim() !== (current.explanation || "").trim();

  return (
    <div className="space-y-4" data-testid="diff-viewer">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: Bản gốc */}
        <Card className="border-red-200 bg-red-50/20">
          <CardHeader className="pb-3 border-b border-red-100">
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-red-900">
              <span>Bản gốc (Import / AI)</span>
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                Gốc
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Nội dung câu hỏi:</p>
              <div
                className={`p-2 rounded border bg-background ${
                  isContentChanged ? "border-red-300 line-through text-red-700 bg-red-50/40" : ""
                }`}
              >
                {original.content}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Các phương án:</p>
              <div className="space-y-1.5">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const isChanged =
                    opt === "A"
                      ? isAChanged
                      : opt === "B"
                      ? isBChanged
                      : opt === "C"
                      ? isCChanged
                      : isDChanged;
                  return (
                    <div
                      key={opt}
                      className={`p-2 rounded border text-xs flex items-center gap-2 bg-background ${
                        isChanged ? "border-red-300 line-through text-red-700 bg-red-50/40" : ""
                      }`}
                    >
                      <span className="font-bold text-muted-foreground">{opt}.</span>
                      <span className="flex-1">{original.options[opt]}</span>
                      {original.correctAnswer === opt && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1">
                          Đáp án đúng
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Đáp án đúng:</p>
              <div
                className={`p-2 rounded border bg-background font-bold ${
                  isAnswerChanged ? "border-red-300 line-through text-red-700 bg-red-50/40" : ""
                }`}
              >
                Phương án {original.correctAnswer}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Giải thích:</p>
              <div
                className={`p-2 rounded border bg-background text-xs ${
                  isExplanationChanged ? "border-red-300 line-through text-red-700 bg-red-50/40" : ""
                }`}
              >
                {original.explanation || "(Không có giải thích)"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Bản A đã sửa */}
        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-emerald-900">
              <span>Bản GV A đã sửa</span>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                Đã sửa
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-4 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground">Nội dung câu hỏi:</p>
                {isContentChanged && (
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                    [Đã đổi]
                  </span>
                )}
              </div>
              <div
                className={`p-2 rounded border bg-background ${
                  isContentChanged ? "border-emerald-400 underline decoration-emerald-500 font-medium bg-emerald-50/40" : ""
                }`}
              >
                {current.content}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Các phương án:</p>
              <div className="space-y-1.5">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const isChanged =
                    opt === "A"
                      ? isAChanged
                      : opt === "B"
                      ? isBChanged
                      : opt === "C"
                      ? isCChanged
                      : isDChanged;
                  return (
                    <div
                      key={opt}
                      className={`p-2 rounded border text-xs flex items-center gap-2 bg-background ${
                        isChanged ? "border-emerald-400 underline decoration-emerald-500 font-medium bg-emerald-50/40" : ""
                      }`}
                    >
                      <span className="font-bold text-muted-foreground">{opt}.</span>
                      <span className="flex-1">{current.options[opt]}</span>
                      {isChanged && (
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                          [Đã đổi]
                        </span>
                      )}
                      {current.correctAnswer === opt && (
                        <Badge variant="default" className="text-[10px] py-0 px-1 bg-emerald-600">
                          Đáp án đúng
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground">Đáp án đúng:</p>
                {isAnswerChanged && (
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                    [Đã đổi]
                  </span>
                )}
              </div>
              <div
                className={`p-2 rounded border bg-background font-bold ${
                  isAnswerChanged ? "border-emerald-400 underline decoration-emerald-500 font-medium bg-emerald-50/40" : ""
                }`}
              >
                Phương án {current.correctAnswer}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground">Giải thích:</p>
                {isExplanationChanged && (
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                    [Đã đổi]
                  </span>
                )}
              </div>
              <div
                className={`p-2 rounded border bg-background text-xs ${
                  isExplanationChanged ? "border-emerald-400 underline decoration-emerald-500 font-medium bg-emerald-50/40" : ""
                }`}
              >
                {current.explanation || "(Không có giải thích)"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
