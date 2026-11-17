import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SessionResult } from "@/lib/api/types";
import { vi } from "@/messages/vi";
import {
  AlertTriangle,
  BookOpen,
  SpellCheck,
  CheckCircle2,
  TrendingUp,
  Brain,
  SlidersHorizontal,
  FileText,
  ArrowLeft,
  AlertCircle,
  Info,
} from "lucide-react";

const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1_PLUS"] as const;

const TOPIC_NAMES: Record<string, string> = {
  academic_vocabulary: "Từ vựng học thuật (Academic Vocabulary)",
  sustainable_vocab: "Từ vựng chủ đề môi trường (Sustainable Vocab)",
  to_be_present: "Động từ To Be ở hiện tại",
  present_simple: "Thì hiện tại đơn (Present Simple)",
  past_simple: "Thì quá khứ đơn (Past Simple)",
  comparative: "Câu so sánh (Comparatives)",
  present_perfect: "Thì hiện tại hoàn thành (Present Perfect)",
  modal_verbs: "Động từ khuyết thiếu (Modal Verbs)",
  passive_voice: "Câu bị động (Passive Voice)",
  first_conditional: "Câu điều kiện loại 1 (First Conditional)",
  second_conditional: "Câu điều kiện loại 2 (Second Conditional)",
  relative_clauses: "Mệnh đề quan hệ (Relative Clauses)",
  inversion: "Đảo ngữ (Inversion)",
  mixed_conditionals: "Câu điều kiện hỗn hợp (Mixed Conditionals)",
  subjunctive_mood: "Thể giả định (Subjunctive Mood)",
  cleft_sentences: "Câu chẻ (Cleft Sentences)",
  participle_clauses: "Mệnh đề phân từ (Participle Clauses)",
  "Past Tenses & Conditionals": "Past Tenses & Conditionals",
};

function formatTopic(topic: string): string {
  if (TOPIC_NAMES[topic]) return TOPIC_NAMES[topic];
  return topic
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CEFR_DESCRIPTIONS: Record<string, { title: string; desc: string; bg: string }> = {
  PRE_A1: {
    title: "Pre-A1 - Beginner",
    desc: "Trình độ vỡ lòng. Có khả năng nhận biết và sử dụng một số từ ngữ cơ bản trong tình huống rất quen thuộc.",
    bg: "bg-slate-400",
  },
  A1: {
    title: "A1 - Elementary",
    desc: "Trình độ sơ cấp. Có khả năng hiểu và sử dụng các cấu trúc quen thuộc hàng ngày và các từ ngữ rất cơ bản.",
    bg: "bg-sky-300",
  },
  A2: {
    title: "A2 - Pre-Intermediate",
    desc: "Trình độ tiền trung cấp. Có khả năng hiểu các câu và cấu trúc thông dụng liên quan đến các lĩnh vực cơ bản.",
    bg: "bg-sky-400",
  },
  B1: {
    title: "B1 - Intermediate",
    desc: "Trình độ trung cấp độc lập. Có khả năng giao tiếp tự tin trong các ngữ cảnh quen thuộc và xử lý cấu trúc câu phức vừa phải.",
    bg: "bg-[#38BDF8]",
  },
  B2: {
    title: "B2 - Upper-Intermediate",
    desc: "Trình độ trung cao cấp. Có khả năng giao tiếp lưu loát, tự nhiên và hiểu các nội dung chuyên ngành phức tạp.",
    bg: "bg-sky-600",
  },
  C1_PLUS: {
    title: "C1+ - Advanced / Proficient",
    desc: "Trình độ cao cấp và thành thạo. Có khả năng sử dụng ngôn ngữ linh hoạt, chuẩn xác trong các tình huống học thuật và nghề nghiệp.",
    bg: "bg-sky-800",
  },
};

export function ResultCard({ result }: { result?: SessionResult | null }) {
  if (!result) {
    return (
      <div className="w-full max-w-[720px] mx-auto p-6 text-center text-on-surface-variant">
        Không có dữ liệu kết quả bài thi.
      </div>
    );
  }

  const ability = result.ability ?? {
    theta: (result as any)?.thetaFinal ?? (result as any)?.theta ?? 0,
    standardError: (result as any)?.seFinal ?? (result as any)?.standardError ?? 0.35,
    ci95: (result as any)?.confidenceInterval95 ?? [0, 0],
  };
  const meta = result.meta ?? {
    itemsAdministered: (result as any)?.totalItems ?? (result as any)?.itemsAdministered ?? 0,
    durationSeconds: (result as any)?.durationSeconds ?? 0,
    stoppingReason: (result as any)?.stoppingReason ?? "SE_REACHED",
  };
  const cefrKey = result.cefrLevel ?? "B1";
  const levelDisplay = vi.cefrLevel[cefrKey] ?? cefrKey;
  const cefrInfo = CEFR_DESCRIPTIONS[cefrKey] ?? CEFR_DESCRIPTIONS["B1"]!;
  const confidenceDisplay =
    (vi.cefrConfidence as any)?.[result.cefrConfidence] ??
    (vi.cefrConfidence as any)?.[(result as any)?.confidenceLevel] ??
    result.cefrConfidence ??
    "Cao";

  // Stopping reason label
  const stopReason: string = String(meta?.stoppingReason ?? (result as any)?.stoppingReason ?? "SE_REACHED");
  const stopReasonText =
    (vi.stoppingReason as any)?.[stopReason] ??
    (stopReason === "SE_REACHED" || stopReason === "SE_THRESHOLD"
      ? "Đạt ngưỡng tin cậy (SE < 0.35)"
      : stopReason === "MAX_ITEMS" || stopReason === "MAX_ITEMS_REACHED"
        ? "Đã hoàn thành tối đa 25 câu hỏi"
        : stopReason === "TIMEOUT"
          ? "Hết thời gian làm bài"
          : "Đã hoàn tất quy trình khảo thí thích ứng");

  const skillProfiles = result.skillProfiles ?? [];
  const vocabProfile = skillProfiles.find((s) => s.skill === "VOCABULARY");
  const grammarProfile = skillProfiles.find((s) => s.skill === "GRAMMAR");

  const vocabTotal =
    vocabProfile?.itemsAdministered ??
    (vocabProfile as any)?.questionsCount ??
    (vocabProfile as any)?.total ??
    0;
  const vocabCorrect = vocabProfile?.correctCount ?? 0;

  const grammarTotal =
    grammarProfile?.itemsAdministered ??
    (grammarProfile as any)?.questionsCount ??
    (grammarProfile as any)?.total ??
    0;
  const grammarCorrect = grammarProfile?.correctCount ?? 0;

  // Position on CEFR scale bar (0% to 100%)
  const levelIndex = CEFR_LEVELS.indexOf(cefrKey as any);
  const scalePercent =
    levelIndex >= 0
      ? Math.min(95, Math.max(5, ((levelIndex + 0.5) / CEFR_LEVELS.length) * 100))
      : 58;

  // Chuẩn hóa và chống lỗi NaN / undefined ở bảng Error Patterns
  const errorPatterns = (result.errorPatterns ?? []).map((e: any, idx: number) => {
    const rawTag = e.topicTag ?? e.topic ?? `Chủ điểm ${idx + 1}`;
    const topicTitle = formatTopic(rawTag);
    const attempted =
      typeof e.itemsAttempted === "number"
        ? e.itemsAttempted
        : typeof e.total === "number"
          ? e.total
          : typeof e.count === "number"
            ? e.count + (e.correctCount ?? 0)
            : 1;
    const correct = typeof e.correctCount === "number" ? e.correctCount : 0;
    const accuracy =
      typeof e.accuracyRate === "number"
        ? e.accuracyRate
        : attempted > 0
          ? correct / attempted
          : 0;
    const errorPct = Math.max(0, Math.min(100, Math.round((1 - accuracy) * 100)));
    const severity = e.severity ?? (accuracy < 0.4 ? "HIGH" : accuracy < 0.7 ? "MEDIUM" : "LOW");
    return {
      key: `${rawTag}-${idx}`,
      rawTag,
      topicTitle,
      skill: e.skill === "VOCABULARY" ? "Từ vựng" : "Ngữ pháp",
      attempted,
      correct,
      errorPct,
      severity,
    };
  });

  const recommendations = result.aiRecommendations ?? [];

  return (
    <div
      className="w-full max-w-[720px] mx-auto px-margin-mobile md:px-margin py-space-xl flex flex-col gap-space-lg"
      data-testid="result-card"
    >
      {/* Top Status Banner: Cảnh báo Hiệu ứng biên (Boundary Effect) */}
      {result.boundaryEffect && (
        <div
          data-testid="boundary-effect-warning"
          className="p-space-md rounded-xl bg-amber-100/60 border border-amber-300 text-amber-800 text-body-sm flex items-start gap-space-sm shadow-sm"
        >
          <AlertTriangle className="text-amber-800 text-[20px] w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-on-surface text-[14px]">Lưu ý kết quả vùng biên</p>
            <p className="text-on-surface-variant text-[13px] mt-0.5">
              Kết quả nằm ở vùng biên của thang đo. Mức này có thể chưa phản ánh chính xác năng lực
              của bạn, hãy trao đổi với giáo viên khi xếp lớp.
            </p>
          </div>
        </div>
      )}

      {/* KHỐI 1: TÓM TẮT KẾT QUẢ THEO CHUẨN STITCH UI */}
      <section
        className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col items-center text-center relative overflow-hidden"
        data-testid="cefr-badge"
      >
        <div className="w-full flex justify-between items-center mb-space-md">
          <span className="font-label-tag text-label-tag uppercase tracking-wider text-on-surface-variant font-semibold text-xs">
            Kết quả kiểm tra xếp lớp CAT
          </span>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-tag text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Độ tin cậy: {confidenceDisplay}
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">
              (dựa trên sai số chuẩn SE)
            </span>
          </div>
        </div>

        {/* CEFR Pill Badge */}
        <div className="my-space-sm flex flex-col items-center">
          <div
            className={`px-8 py-3 rounded-full ${cefrInfo.bg} text-white shadow-md flex items-center justify-center transform transition-transform hover:scale-105 duration-200`}
          >
            <span data-testid="cefr-level" className="font-headline-xl text-[36px] font-extrabold tracking-tight">
              {cefrKey === "C1_PLUS" ? "C1+" : cefrKey}
            </span>
          </div>
          <h1 className="mt-space-md font-headline-lg text-2xl text-on-surface font-bold tracking-tight">
            CEFR: {cefrInfo.title}
          </h1>
          <p className="font-body-default text-sm text-on-surface-variant max-w-lg mt-space-xs leading-relaxed">
            {cefrInfo.desc}
          </p>
        </div>

        {/* Lý do kết thúc bài thi */}
        <div className="w-full mt-space-md pt-space-md border-t border-outline-variant/30 flex flex-col items-center gap-space-xs">
          <div className="flex items-center gap-1.5 text-sm font-medium text-on-surface">
            <CheckCircle2 className="text-primary w-4 h-4" />
            <span>Lý do kết thúc bài thi:</span>
            <span data-testid="stopping-reason" className="font-semibold text-primary">
              {stopReasonText}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 text-[11px] text-on-surface-variant">
            <span
              className={`px-2 py-0.5 rounded-full ${
                stopReason === "SE_REACHED" || stopReason === "SE_THRESHOLD"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              Đạt SE &lt; 0.35 {stopReason === "SE_REACHED" || stopReason === "SE_THRESHOLD" ? "(Hiện tại)" : ""}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                stopReason === "MAX_ITEMS"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              Đủ 25 câu {stopReason === "MAX_ITEMS" ? "(Hiện tại)" : ""}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                stopReason === "BOUNDARY"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              Kết thúc sớm do năng lực ngoài vùng đo
            </span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                stopReason === "TIMEOUT"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              Hết thời gian làm bài {stopReason === "TIMEOUT" ? "(Hiện tại)" : ""}
            </span>
          </div>
        </div>
      </section>

      {/* KHỐI 2: ĐIỂM SỐ NĂNG LỰC RASCH (Rasch Theta) */}
      <section
        className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
        data-testid="theta-value"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-md text-lg text-on-surface font-semibold">
                Ước Lượng Thích Ứng (Rasch Theta)
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Phân bố năng lực chuẩn hóa đối chuẩn khung CEFR
              </p>
            </div>
          </div>
        </div>

        {/* Thang đo dải ngang 6 nấc CEFR */}
        <div className="pt-space-md pb-space-sm px-space-xs">
          <div className="relative w-full">
            {/* Track */}
            <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
              <div className="h-full w-1/6 bg-sky-100" title="Pre-A1" />
              <div className="h-full w-1/6 bg-sky-200" title="A1" />
              <div className="h-full w-1/6 bg-sky-300" title="A2" />
              <div className="h-full w-1/6 bg-[#38BDF8]" title="B1" />
              <div className="h-full w-1/6 bg-sky-500" title="B2" />
              <div className="h-full w-1/6 bg-sky-700" title="C1+" />
            </div>
            {/* Position Marker */}
            <div
              className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
              style={{ left: `${scalePercent}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-primary ring-4 ring-white shadow-md flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div className="mt-1 px-2 py-0.5 rounded bg-primary text-on-primary font-label-tag text-[10px] font-bold shadow-sm whitespace-nowrap">
                Bạn ở đây
              </div>
            </div>
          </div>
          {/* Labels */}
          <div className="grid grid-cols-6 text-center mt-6 text-xs text-on-surface-variant font-medium">
            <span className={cefrKey === "PRE_A1" ? "font-bold text-primary" : ""}>Pre-A1</span>
            <span className={cefrKey === "A1" ? "font-bold text-primary" : ""}>A1</span>
            <span className={cefrKey === "A2" ? "font-bold text-primary" : ""}>A2</span>
            <span className={cefrKey === "B1" ? "font-bold text-primary" : ""}>B1</span>
            <span className={cefrKey === "B2" ? "font-bold text-primary" : ""}>B2</span>
            <span className={cefrKey === "C1_PLUS" ? "font-bold text-primary" : ""}>C1+</span>
          </div>
        </div>

        {/* 3 Chỉ số đo lường khoa học */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-space-xs border-t border-outline-variant/20">
          <div className="p-3 rounded-lg bg-surface flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
              Điểm năng lực θ
            </span>
            <span className="font-mono text-base font-bold text-primary">
              {ability.theta >= 0 ? `+${ability.theta.toFixed(2)}` : ability.theta.toFixed(2)}
            </span>
            <span className="text-[10px] text-on-surface-variant">Thước đo logit Rasch 1PL</span>
          </div>
          <div className="p-3 rounded-lg bg-surface flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
              Sai số chuẩn SE
            </span>
            <span data-testid="se-value" className="font-mono text-base font-bold text-on-surface">
              ± {ability.standardError.toFixed(2)}
            </span>
            <span className="text-[10px] text-on-surface-variant">Độ hội tụ thuật toán</span>
          </div>
          <div className="p-3 rounded-lg bg-surface flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
              Khoảng tin cậy 95%
            </span>
            <span data-testid="ci-value" className="font-mono text-base font-bold text-on-surface">
              [{ability.ci95[0].toFixed(2)} ; {ability.ci95[1].toFixed(2)}]
            </span>
            <span className="text-[10px] text-on-surface-variant">Khoảng dao động tin cậy</span>
          </div>
        </div>

        <div className="pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
          <span className="font-medium">Chỉ số ước lượng năng lực:</span>
          <span className="font-mono font-bold text-primary text-[14px] px-2.5 py-1 rounded bg-primary-fixed/40">
            θ = {ability.theta >= 0 ? `+${ability.theta.toFixed(2)}` : ability.theta.toFixed(2)} ±{" "}
            {ability.standardError.toFixed(2)} (SE)
          </span>
        </div>
      </section>

      {/* KHỐI 3: PHÂN TÍCH THEO 2 KỸ NĂNG CỐT LÕI (Chuẩn Phương án 1 Q-D) */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface font-bold">
            <SlidersHorizontal className="w-5 h-5 text-on-surface" />
          </div>
          <div>
            <h2 className="font-headline-md text-lg text-on-surface font-semibold">
              Năng Lực Theo Hợp Phần Ngôn Ngữ
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-space-md pt-space-xs">
          {/* Từ vựng */}
          <div className="flex flex-col gap-space-xs" data-testid="skill-vocab">
            <div className="flex justify-between items-center py-space-xs text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="text-primary w-5 h-5" />
                <span className="font-semibold text-on-surface">Từ vựng (Vocabulary):</span>
              </div>
              <span className="font-bold text-on-surface text-base">
                {vocabProfile ? `${vocabCorrect}/${vocabTotal} câu` : "—"}
              </span>
            </div>
          </div>

          {/* Ngữ pháp */}
          <div className="flex flex-col gap-space-xs" data-testid="skill-grammar">
            <div className="flex justify-between items-center py-space-xs text-sm border-t border-outline-variant/20">
              <div className="flex items-center gap-2">
                <SpellCheck className="text-secondary w-5 h-5" />
                <span className="font-semibold text-on-surface">Ngữ pháp (Grammar):</span>
              </div>
              <span className="font-bold text-on-surface text-base">
                {grammarProfile ? `${grammarCorrect}/${grammarTotal} câu` : "—"}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-outline italic pt-1 border-t border-outline-variant/15">
          * Ghi chú: Mô hình Rasch 1PL đơn chiều đo năng lực tổng thể; số câu từng kỹ năng chỉ thống
          kê số lượng câu đúng/sai, không gán nhãn CEFR độc lập.
        </p>
      </section>

      {/* KHỐI 4: CHỦ ĐỀ CẦN CẢI THIỆN */}
      <section
        className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
        data-testid="error-patterns"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-error-container/60 flex items-center justify-center text-error font-bold">
              <AlertCircle className="w-5 h-5 text-error" />
            </div>
            <div>
              <h2 className="font-headline-md text-lg text-on-surface font-semibold">
                Chủ Đề Cần Cải Thiện
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Phân tích lỗi sai thích ứng định vị lỗ hổng kiến thức
              </p>
            </div>
          </div>
        </div>

        {/* Error Pattern List */}
        <div className="overflow-hidden rounded-lg bg-surface">
          <div className="p-space-md flex flex-col gap-space-md">
            {errorPatterns.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic py-3 text-center">
                Bạn không có chủ đề sai lặp lại nào trong đợt làm bài này.
              </p>
            ) : (
              errorPatterns.map((e) => {
                const isHigh = e.severity === "HIGH";
                const isMedium = e.severity === "MEDIUM";
                return (
                  <div
                    key={e.key}
                    className="bg-surface-container-lowest p-space-md rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm shadow-xs border border-outline-variant/20"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-on-surface">
                          {e.topicTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant">
                          {e.skill}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Làm đúng:{" "}
                        <span className="font-bold text-on-surface">
                          {e.correct}/{e.attempted} câu
                        </span>{" "}
                        (Tỉ lệ sai {e.errorPct}%)
                      </p>
                    </div>

                    <div className="flex items-center self-start sm:self-center">
                      {isHigh ? (
                        <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                          Nghiêm trọng
                        </span>
                      ) : isMedium ? (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                          Trung bình
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-slate-700" />
                          Nhẹ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* KHỐI 5: GỢI Ý HỌC TẬP TỪ AI */}
      {recommendations.length > 0 && (
        <section
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
          data-testid="recommendations"
        >
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-md text-lg text-on-surface font-semibold">
                Gợi Ý Lộ Trình Cải Thiện Từ AI
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Đề xuất cá nhân hóa dựa trên phân tích lỗi làm bài
              </p>
            </div>
          </div>

          <div className="bg-surface p-space-md rounded-lg">
            <ul className="flex flex-col gap-space-sm text-sm text-on-surface">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-space-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* KHỐI 6: CHÂN TRANG ĐIỀU HƯỚNG */}
      <div className="flex flex-col items-center gap-space-md pt-space-xs pb-space-2xl">
        <Button
          asChild
          data-testid="open-review"
          className="w-full h-12 rounded-lg bg-primary-container text-on-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary shadow-sm active:scale-[0.99] transition-all cursor-pointer text-base"
        >
          <Link href={`/results/${result.sessionId}/review`}>
            <FileText className="w-5 h-5" />
            <span>Xem giải thích chi tiết đáp án</span>
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          data-testid="back-home"
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 py-space-xs font-medium"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Về trang chủ sinh viên</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
