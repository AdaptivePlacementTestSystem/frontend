"use client";

import { CEFR_LEVELS, type CefrLevelValue as CefrLevel } from "@apt/shared-types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import {
  downloadCsv,
  getClassDistribution,
  getClassErrorPatterns,
  listExamRounds,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { notifyError } from "@/lib/api/notify-error";
import type { ExportType } from "@/lib/api/types";
import { vi } from "@/messages/vi";
import {
  ChevronDown,
  Download,
  CheckCircle2,
  Brain,
  SlidersHorizontal,
  BarChart3,
  Table as TableIcon,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

const CEFR_COLORS: Record<CefrLevel, string> = {
  PRE_A1: "#E0F2FE",
  A1: "#BAE6FD",
  A2: "#7DD3FC",
  B1: "#38BDF8",
  B2: "#0EA5E9",
  C1_PLUS: "#0369A1",
};

const CEFR_DESCRIPTIONS: Record<CefrLevel, string> = {
  PRE_A1: "Cần học lại chương trình dự bị tăng cường",
  A1: "Xếp vào lớp General English 1",
  A2: "Xếp vào lớp General English 2",
  B1: "Nhóm chuẩn đầu vào học kỳ chuyên ngành",
  B2: "Miễn thi 2 học phần cơ sở",
  C1_PLUS: "Đạt chuẩn đầu ra chuẩn bị xét học bổng",
};

const TOPIC_LABELS: Record<string, string> = {
  past_simple: "Thì quá khứ đơn (Past Simple)",
  present_perfect: "Thì hiện tại hoàn thành (Present Perfect)",
  conditionals: "Câu điều kiện (Conditionals)",
  relative_clauses: "Mệnh đề quan hệ (Relative Clauses)",
  passive_voice: "Câu bị động (Passive Voice)",
  phrasal_verbs: "Cụm động từ (Phrasal Verbs)",
  collocations: "Cụm từ cố định (Collocations)",
  idioms: "Thành ngữ (Idioms)",
  word_formation: "Cấu tạo từ (Word Formation)",
  academic_vocabulary: "Từ vựng học thuật (Academic Vocabulary)",
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [distViewMode, setDistViewMode] = useState<"chart" | "table">("chart");
  const [busy, setBusy] = useState<ExportType | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Danh sách các kỳ thi để nạp vào filter-round
  const roundsQuery = useQuery({
    queryKey: ["exam-rounds", "list"],
    queryFn: ({ signal }) => listExamRounds(signal),
    staleTime: 60_000,
  });

  // Phân phối CEFR toàn trường / theo kỳ (UCGV07, BR-13)
  const dist = useQuery({
    queryKey: ["report", "distribution", selectedRoundId],
    queryFn: ({ signal }) => getClassDistribution(selectedRoundId || undefined, signal),
  });

  // Error patterns thống kê (UCGV07)
  const errs = useQuery({
    queryKey: ["report", "errors", selectedRoundId],
    queryFn: async ({ signal }) => {
      try {
        return await getClassErrorPatterns(selectedRoundId || undefined, signal);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
      }
    },
  });

  const exportCsv = async (type: ExportType) => {
    setBusy(type);
    setShowExportMenu(false);
    try {
      const { blob, filename } = await downloadCsv(type, selectedRoundId || undefined);
      saveBlob(blob, filename);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(null);
    }
  };

  const chartData = CEFR_LEVELS.map((level) => ({
    name: vi.cefrLevel[level],
    level,
    count: dist.data?.cefrDistribution?.[level] ?? 0,
    fill: CEFR_COLORS[level],
  }));

  const totalStudents = dist.data?.totalStudents ?? 0;

  // Tìm mức CEFR phổ biến nhất
  let dominantLevel: CefrLevel = "B1";
  let maxCount = -1;
  if (dist.data?.cefrDistribution) {
    for (const lvl of CEFR_LEVELS) {
      const c = dist.data.cefrDistribution[lvl] ?? 0;
      if (c > maxCount) {
        maxCount = c;
        dominantLevel = lvl;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filters bar (Stitch UI layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
            Báo cáo Thống kê Kết quả & Phân tích Năng lực
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Tổng hợp dữ liệu trắc nghiệm thích ứng CAT và phân phối trình độ CEFR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chip lọc Kỳ thi (filter-round) - BR-13 */}
          <div className="relative min-w-[220px]">
            <select
              aria-label="Chọn kỳ thi để lọc báo cáo"
              className="w-full h-11 pl-3 pr-8 bg-surface-container-low text-on-surface font-label-primary text-sm rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer transition-all appearance-none"
              data-testid="filter-round"
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
            >
              <option value="">Tất cả kỳ thi (Toàn hệ thống)</option>
              {roundsQuery.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>

          {/* Nút Xuất CSV (export-csv) - UCGV08 */}
          <div className="relative">
            <button
              className="h-11 px-4 bg-primary text-white hover:bg-primary/90 font-label-primary text-sm rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              data-testid="export-csv"
              disabled={busy !== null}
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="h-4 w-4" />
              <span>{busy ? "Đang xuất..." : "Xuất CSV"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-20 py-1 font-body-sm text-sm">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-surface-container text-on-surface flex items-center justify-between"
                  data-testid="export-profiles"
                  type="button"
                  onClick={() => exportCsv("profiles")}
                >
                  <span>Hồ sơ từng sinh viên</span>
                  <span className="text-xs text-on-surface-variant font-mono">.csv</span>
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-surface-container text-on-surface flex items-center justify-between border-t border-outline-variant/50"
                  data-testid="export-distribution"
                  type="button"
                  onClick={() => exportCsv("distribution")}
                >
                  <span>Phân phối mức CEFR</span>
                  <span className="text-xs text-on-surface-variant font-mono">.csv</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {dist.isPending ? (
        <LoadingBlock rows={4} />
      ) : dist.isError ? (
        <ErrorBlock error={dist.error} onRetry={() => dist.refetch()} />
      ) : totalStudents === 0 ? (
        <div className="bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant text-center">
          <EmptyBlock text="Chưa có sinh viên nào hoàn thành bài thi trong kỳ này." />
        </div>
      ) : (
        <>
          {/* Key Psychometric Metrics Cards (3 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat 1: Completed Students */}
            <div
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between"
              data-testid="stat-completed"
            >
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Sinh viên đã hoàn thành
                </span>
                <span className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-headline-xl text-headline-xl text-on-surface font-bold"
                    data-testid="report-total"
                  >
                    {totalStudents}
                  </span>
                  <span className="font-body-sm text-on-surface-variant">thí sinh</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Trạng thái: Hoàn tất chẩn đoán</span>
                  <span>100%</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>

            {/* Stat 2: Dominant CEFR Level */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Trình độ phổ biến nhất
                </span>
                <span className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-primary font-bold">
                    {vi.cefrLevel[dominantLevel]}
                  </span>
                  <span className="font-label-tag text-xs px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                    {maxCount} thí sinh
                  </span>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Chiếm {totalStudents > 0 ? ((maxCount / totalStudents) * 100).toFixed(1) : 0}%
                  tổng quy mô khảo thí
                </p>
              </div>
            </div>

            {/* Stat 3: Average Theta Ability Score */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Điểm năng lực Rasch θ trung bình
                </span>
                <span className="w-9 h-9 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
                    {dist.data.averageTheta >= 0 ? "+" : ""}
                    {dist.data.averageTheta.toFixed(2)}
                  </span>
                  <span className="font-body-sm text-on-surface-variant">logit</span>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Thang đo chuẩn hóa IRT Rasch [-4.0, +4.0]
                </p>
              </div>
            </div>
          </div>

          {/* Section: CEFR Level Distribution Card */}
          <section
            className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-space-lg"
            data-testid="cefr-distribution"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-space-lg border-b border-outline-variant/60">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Phân phối trình độ CEFR
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Tỷ lệ học viên theo 6 bậc đo lường chuẩn hóa Châu Âu
                </p>
              </div>

              {/* View switcher: Biểu đồ | Bảng */}
              <div className="flex items-center bg-surface-container p-1 rounded-lg self-start sm:self-auto">
                <button
                  className={`px-3 py-1.5 rounded-md font-label-primary text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    distViewMode === "chart"
                      ? "bg-surface-container-lowest text-primary shadow-sm font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  id="btn-chart-view"
                  data-testid="view-chart"
                  type="button"
                  onClick={() => setDistViewMode("chart")}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Biểu đồ</span>
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md font-label-primary text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    distViewMode === "table"
                      ? "bg-surface-container-lowest text-primary shadow-sm font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  id="btn-table-view"
                  data-testid="view-table"
                  type="button"
                  onClick={() => setDistViewMode("table")}
                >
                  <TableIcon className="h-4 w-4" />
                  <span>Bảng số liệu</span>
                </button>
              </div>
            </div>

            {/* Visual View */}
            {distViewMode === "chart" ? (
              <div className="space-y-6 pt-4">
                {/* Multi-segment preview bar */}
                <div className="w-full h-6 rounded-lg overflow-hidden flex bg-surface-container shadow-inner">
                  {CEFR_LEVELS.map((lvl) => {
                    const count = dist.data.cefrDistribution[lvl] ?? 0;
                    const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={lvl}
                        className="h-full relative group transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CEFR_COLORS[lvl],
                        }}
                        title={`${vi.cefrLevel[lvl]}: ${pct.toFixed(1)}% (${count} SV)`}
                      />
                    );
                  })}
                </div>

                {/* Individual Level Progress Bars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                  {CEFR_LEVELS.map((lvl) => {
                    const count = dist.data.cefrDistribution[lvl] ?? 0;
                    const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                    return (
                      <div key={lvl} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between font-body-sm text-body-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: CEFR_COLORS[lvl] }}
                            />
                            <span className="font-semibold text-on-surface">
                              {vi.cefrLevel[lvl]}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              ({CEFR_DESCRIPTIONS[lvl]})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-label-primary text-xs">
                            <span className="text-on-surface font-semibold">{count} SV</span>
                            <span className="text-on-surface-variant">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CEFR_COLORS[lvl],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recharts BarChart */}
                <div aria-label={vi.reports.distribution} className="h-56 w-full pt-4" role="img">
                  <ResponsiveContainer height="100%" minWidth={0} width="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              /* Data Table View */
              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left font-body-default text-sm">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-tag text-xs font-semibold">
                      <th className="py-3 px-4 rounded-l-lg">CẤP ĐỘ CEFR</th>
                      <th className="py-3 px-4">SỐ LƯỢNG SINH VIÊN</th>
                      <th className="py-3 px-4">TỈ LỆ CHIẾM</th>
                      <th className="py-3 px-4 rounded-r-lg">GHI CHÚ HỌC THUẬT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-sm">
                    {CEFR_LEVELS.map((lvl) => {
                      const count = dist.data.cefrDistribution[lvl] ?? 0;
                      const pct =
                        totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={lvl} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4 flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: CEFR_COLORS[lvl] }}
                            />
                            <span className="font-semibold text-on-surface">
                              {vi.cefrLevel[lvl]}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-on-surface">{count}</td>
                          <td className="py-3 px-4 text-on-surface">{pct}%</td>
                          <td className="py-3 px-4 text-on-surface-variant">
                            {CEFR_DESCRIPTIONS[lvl]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section: Error Patterns & Pedagogical Interventions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Card 1: Error Pattern Table (8 cols) */}
            <section
              className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-space-lg"
              data-testid="error-pattern-table"
            >
              <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/60">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Phân tích chủ đề sai nhiều nhất
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Xác định các lỗ hổng kiến thức cốt lõi dựa trên tỉ lệ phản hồi không chính xác
                  </p>
                </div>
                <span className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              </div>

              {errs.isPending ? (
                <LoadingBlock rows={3} />
              ) : errs.isError ? (
                <ErrorBlock error={errs.error} onRetry={() => errs.refetch()} />
              ) : !errs.data || errs.data.length === 0 ? (
                <div className="py-8 text-center text-sm text-on-surface-variant">
                  Chưa ghi nhận lỗi sai phổ biến nào cho phạm vi này.
                </div>
              ) : (
                <div className="overflow-x-auto pt-4">
                  <table
                    className="w-full text-left font-body-default text-sm border-collapse"
                    data-testid="error-patterns"
                  >
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-tag text-xs font-semibold">
                        <th className="py-3 px-4 rounded-l-lg">CHỦ ĐỀ KIẾN THỨC</th>
                        <th className="py-3 px-3">PHÂN LOẠI</th>
                        <th className="py-3 px-3 text-center">TỈ LỆ SAI</th>
                        <th className="py-3 px-3 text-center">SỐ LƯỢNG</th>
                        <th className="py-3 px-4 text-right rounded-r-lg">MỨC ĐỘ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container font-body-sm text-sm">
                      {errs.data.map((item) => {
                        const isSevere = item.errorRate >= 60;
                        const isMedium = item.errorRate >= 35 && item.errorRate < 60;
                        return (
                          <tr
                            key={item.topicTag}
                            className="hover:bg-surface-container-low transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-on-surface">
                              {TOPIC_LABELS[item.topicTag] ?? item.topicTag}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-surface-container text-xs text-on-surface-variant">
                                {item.skill === "VOCABULARY" ? "Từ vựng" : "Ngữ pháp"}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-error">
                              {item.errorRate}%
                            </td>
                            <td className="py-3.5 px-3 text-center text-on-surface">
                              {item.studentCount} SV
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isSevere
                                    ? "bg-error-container text-on-error-container font-semibold"
                                    : isMedium
                                      ? "bg-surface-container-high text-primary font-semibold"
                                      : "bg-secondary-container text-on-secondary-container"
                                }`}
                              >
                                {isSevere ? "Nghiêm trọng" : isMedium ? "Trung bình" : "Nhẹ"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Card 2: AI Pedagogical Interventions (4 cols) */}
            <section className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-space-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/60">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h3 className="font-headline-md text-base font-semibold text-on-surface">
                    Đề xuất can thiệp sư phạm
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
                  Dựa trên mẫu sai sót phổ biến của toàn bộ thí sinh trong kỳ:
                </p>
                <ul className="mt-3 space-y-2.5 text-xs text-on-surface">
                  <li className="flex items-start gap-2 bg-surface-container-low p-2.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Tổ chức 2 buổi chuyên đề bổ trợ về cụm từ cố định và cấu trúc câu điều kiện
                      nâng cao.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 bg-surface-container-low p-2.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Phân bổ thêm bài tập trắc nghiệm vi mô (micro-practice) cho nhóm đạt trình độ
                      A2 và B1.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 bg-surface-container-low p-2.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      Khuyến nghị sinh viên xem kỹ phần giải thích chi tiết câu sai từ mô hình AI
                      Explainer.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 mt-4 border-t border-outline-variant/60">
                <Button
                  className="w-full"
                  size="sm"
                  variant="outline"
                  onClick={() => exportCsv("profiles")}
                >
                  Tải danh sách chi tiết (CSV)
                </Button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
