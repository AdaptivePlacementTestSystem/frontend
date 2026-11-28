"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ItemFlag } from "@/lib/api/types";

interface SoftFlagsProps {
  flags?: ItemFlag[];
}

const REASON_LABELS: Record<string, string> = {
  DUPLICATE_SUSPECTED: "Gần giống một câu trong ngân hàng",
  DUPLICATE_EXACT: "Trùng khớp hoàn toàn với câu hỏi đã có trong ngân hàng",
  DUPLICATE_NEAR: "Gần trùng với câu hỏi đã có trong ngân hàng (T2)",
  DUPLICATE_NEAR_SUSPECT: "Nghi ngờ gần giống một câu trong ngân hàng (T2)",
  DUPLICATE_SEMANTIC_SUSPECT: "Nghi ngờ trùng ngữ nghĩa với câu đã có trong ngân hàng (T3)",
  INDEPENDENT_ANSWER_MISMATCH: "AI giải độc lập (G5) cho đáp án khác với đáp án gốc",
  INDEPENDENT_ANSWER_CHECKED: "AI giải độc lập (G5) trùng khớp đáp án",
  DISTRACTOR_HOMOGENEITY: "Các phương án nhiễu có độ dài hoặc ngữ nghĩa chưa đồng đều",
  WORD_COUNT_OUT_OF_RANGE: "Độ dài câu hỏi vượt phạm vi tiêu chuẩn",
  EXPLANATION_TOO_BRIEF: "Giải thích đáp án còn quá ngắn",
  CEFR_TARGET_MISMATCH: "Độ khó câu hỏi có thể lệch so với mức CEFR mục tiêu",
};

export function SoftFlags({ flags }: SoftFlagsProps) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" data-testid="review-flags">
      {flags.map((flag, idx) => (
        <Alert key={idx} variant="default" className="border-amber-300 bg-amber-50 text-amber-900">
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-600">(!)</span>
            <div className="space-y-1">
              <AlertTitle className="text-xs font-semibold text-amber-900">
                Cảnh báo mềm (Gợi ý kiểm tra)
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-800 space-y-1">
                {flag.reasonCodes.map((code) => (
                  <div key={code} className="flex items-center gap-1.5">
                    <span>• {REASON_LABELS[code] || code}</span>
                    {flag.suspectedDuplicateId && code.startsWith("DUPLICATE_") && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1 text-amber-700 border-amber-400"
                      >
                        Mã câu nghi trùng: {flag.suspectedDuplicateId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                ))}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}
