"use client";

import Link from "next/link";
import { BatchDeadlines } from "./batch-deadlines";
import { BatchReassign } from "./batch-reassign";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";

interface BatchDetail {
  batch: {
    id: string;
    name: string | null;
    source: string;
    status: string;
    skill: string | null;
    cefrTarget: string | null;
    requestedCount: number | null;
    aiCallCount?: number;
    aiCallLimit?: number;
    confirmer?: { id: string } | null;
    jobs?: Array<{ kind: string; status: string; attempts: number; lastError: string | null }>;
  };
  items: Array<{
    id: string;
    content: string;
    status: string;
    administrativelyCancelled?: boolean;
    options?: Record<string, string>;
    correctAnswer?: string;
    explanation?: { content: string } | null;
    checkResults?: Array<{
      checkpoint: string;
      level: string;
      reasonCodes: string[];
      suspectedDuplicateId: string | null;
      checkedAt: string;
    }>;
    reviewEvents?: Array<{ createdAt: string }>;
    reviewer: { fullName: string | null } | null;
    confirmer: { fullName: string | null } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  statusCounts: Array<{ status: string; count: number }>;
  administrativelyCancelledCount?: number;
}

export const batchStatusLabels: Record<string, string> = {
  DRAFT: "Chờ duyệt vòng 1",
  FIRST_APPROVED: "Đã duyệt vòng 1",
  SECOND_APPROVED: "Đã xác nhận vòng 2",
  FINAL_APPROVED: "Đã vào ngân hàng",
  REJECTED: "Giảng viên đã loại",
  AI_REJECTED: "AI đã loại",
  GENERATING: "Đang sinh câu hỏi",
  IMPORTING: "Đang nhập",
  CHECKING: "Chờ kiểm tra chất lượng",
  READY_TO_ASSIGN: "Chờ giao việc",
  IN_REVIEW: "Đang duyệt",
  READY_TO_FINALIZE: "Chờ kiểm tra cuối",
  FINAL_CHECKED: "Đã kiểm tra cuối",
  DONE: "Hoàn tất",
  FAILED: "Thất bại",
  PARTIAL: "Hoàn tất một phần",
  PARTIALLY_IMPORTED: "Đã nhập một phần",
};

export function BatchDetailView({ batchId }: { batchId: string }) {
  const [page, setPage] = useState(1);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState("");
  const q = useQuery({
    queryKey: ["admin-item-batch", batchId, page],
    queryFn: ({ signal }) =>
      apiRequest<BatchDetail>(`/item-batches/${encodeURIComponent(batchId)}`, {
        query: { page, limit: 20 },
        signal,
      }),
    refetchInterval: (query) => {
      const batch = query.state.data?.batch;
      const job = batch?.jobs?.find(
        (entry) => entry.kind === (batch.status === "GENERATING" ? "GENERATE" : "CHECK"),
      );
      return ["CHECKING", "GENERATING"].includes(batch?.status ?? "") &&
        job &&
        ["PENDING", "RUNNING"].includes(job.status)
        ? 5000
        : false;
    },
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <EmptyBlock text="Không có dữ liệu lô câu hỏi." />;
  const { batch, items, total, limit, statusCounts } = q.data;
  const checkJob = batch.jobs?.find((job) => job.kind === "CHECK");
  const generationJob = batch.jobs?.find((job) => job.kind === "GENERATE");
  const counts = new Map(statusCounts.map((entry) => [entry.status, entry.count]));
  async function action(path: string, body?: unknown) {
    setActionBusy(true);
    setActionError("");
    try {
      await apiRequest(path, { method: "POST", body });
      await q.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể thực hiện thao tác");
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <Link href="/admin/item-batches" className="text-sm text-primary hover:underline">
        ← Danh sách lô câu hỏi
      </Link>
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{batch.name || "Lô câu hỏi"}</h1>
            <p className="mt-2 text-sm text-slate-600">Mã lô: {batch.id}</p>
            <p className="mt-1 text-sm text-slate-600">
              {batch.source === "AI_GENERATED" ? "AI sinh" : "Import file"} ·{" "}
              {batch.skill || "Nhiều kỹ năng"} · {batch.cefrTarget || "Nhiều cấp CEFR"}
            </p>
            {batch.aiCallCount !== undefined && batch.aiCallLimit !== undefined && (
              <p className="mt-1 text-sm text-slate-600">
                Lượt gọi AI: {batch.aiCallCount}/{batch.aiCallLimit}
              </p>
            )}
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            {batchStatusLabels[batch.status] || batch.status}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {batch.status === "READY_TO_ASSIGN" && (
            <Link
              href={`/admin/item-batches/${batchId}/assign`}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white"
            >
              Giao việc
            </Link>
          )}
          {(batch.status === "READY_TO_FINALIZE" ||
            batch.status === "FINAL_CHECKED" ||
            batch.status === "PARTIALLY_IMPORTED") && (
            <button
              disabled={actionBusy}
              onClick={() => void action(`/item-batches/${batchId}/final-check`)}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {batch.status === "READY_TO_FINALIZE" ? "Kiểm tra cuối" : "Kiểm tra lại"}
            </button>
          )}
          {(batch.status === "FINAL_CHECKED" || batch.status === "PARTIALLY_IMPORTED") && (
            <button
              disabled={actionBusy}
              onClick={() => void action(`/item-batches/${batchId}/import`)}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Import vào ngân hàng
            </button>
          )}
        </div>
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </section>
      {batch.status === "IN_REVIEW" && (
        <BatchReassign
          batchId={batchId}
          confirmerId={batch.confirmer?.id}
          onSaved={() => {
            void q.refetch();
          }}
        />
      )}
      {batch.status === "IN_REVIEW" && (
        <BatchDeadlines
          batchId={batchId}
          onSaved={() => {
            void q.refetch();
          }}
        />
      )}
      {batch.status === "IN_REVIEW" && (
        <section className="space-y-2 rounded-xl bg-white p-4">
          <h2 className="font-semibold">Hủy các câu còn chờ duyệt</h2>
          <p>
            Chỉ các câu chưa hoàn tất vòng A hoặc B được chuyển sang đã loại; kết quả đã có được giữ
            lại.
          </p>
          <label className="block">
            Lý do hủy{" "}
            <textarea
              maxLength={500}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className="block w-full rounded border p-2"
            />
          </label>
          <button
            type="button"
            disabled={actionBusy || !cancelReason.trim()}
            onClick={() => {
              if (window.confirm("Hủy các câu còn chờ duyệt trong lô?"))
                void action(`/item-batches/${batchId}/cancel-pending`, {
                  reason: cancelReason.trim(),
                });
            }}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Hủy câu chờ duyệt
          </button>
        </section>
      )}
      {batch.status === "GENERATING" && generationJob && (
        <div role="status" className="rounded bg-amber-50 p-4">
          {generationJob.status === "FAILED"
            ? generationJob.lastError === "AI_BUDGET_EXCEEDED"
              ? "Lô đã hết lượt gọi AI."
              : generationJob.lastError === "INSUFFICIENT_REFERENCE_ITEMS"
                ? "Cần ít nhất 3 câu mẫu đã duyệt cùng kỹ năng và CEFR trong ngân hàng."
                : "Sinh câu thất bại; hãy kiểm tra cấu hình dịch vụ AI."
            : "Đang chờ hoặc đang sinh câu hỏi."}
          {generationJob.status === "FAILED" &&
            generationJob.lastError !== "AI_BUDGET_EXCEEDED" && (
              <button
                disabled={actionBusy}
                onClick={() => void action(`/item-batches/${batchId}/retry-generation`)}
                className="ml-3 rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
              >
                Thử sinh lại
              </button>
            )}
        </div>
      )}
      {batch.status === "CHECKING" && (
        <div role="status" className="rounded bg-amber-50 p-4">
          {checkJob?.status === "FAILED"
            ? checkJob.lastError === "AI_BUDGET_EXCEEDED"
              ? "Lô đã hết lượt gọi AI."
              : "Kiểm tra chất lượng thất bại; hãy kiểm tra cấu hình rồi thử lại."
            : "Lô chưa hoàn tất kiểm tra chất lượng; hiện chưa thể giao việc."}
          {(!checkJob ||
            (checkJob.status === "FAILED" && checkJob.lastError !== "AI_BUDGET_EXCEEDED")) && (
            <button
              disabled={actionBusy}
              onClick={() => void action(`/item-batches/${batchId}/retry-checks`)}
              className="ml-3 rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
            >
              Thử kiểm tra lại
            </button>
          )}
        </div>
      )}
      <section
        aria-label="Thống kê trạng thái"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      >
        {[
          "DRAFT",
          "FIRST_APPROVED",
          "SECOND_APPROVED",
          "FINAL_APPROVED",
          "REJECTED",
          "AI_REJECTED",
        ].map((status) => (
          <div key={status} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-600">{batchStatusLabels[status]}</p>
            <p className="mt-2 text-2xl font-semibold">{counts.get(status) ?? 0}</p>
          </div>
        ))}
      </section>
      {(q.data.administrativelyCancelledCount ?? 0) > 0 && <p>Đã hủy hành chính: {q.data.administrativelyCancelledCount} câu (nằm trong số câu đã loại).</p>}
      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Câu hỏi trong lô</h2>
          <span className="text-sm text-slate-600">{total} câu</span>
        </div>
        {items.length === 0 ? (
          <div className="p-4">
            <EmptyBlock text="Không có câu hỏi ở trang này." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4">Nội dung</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">GV duyệt</th>
                  <th className="p-4">GV xác nhận</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="max-w-xl p-4">
                      <span className="block text-xs text-slate-500">{item.id}</span>
                      {item.content}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-700">Xem chi tiết</summary>
                        <ul>
                          {Object.entries(item.options ?? {}).map(([key, value]) => (
                            <li key={key}>
                              {key}. {value}
                              {key === item.correctAnswer ? " ✓ Đáp án" : ""}
                            </li>
                          ))}
                        </ul>
                        {item.explanation?.content && <p>Giải thích: {item.explanation.content}</p>}
                        {item.checkResults?.map((check, i) => (
                          <p key={i}>
                            {check.checkpoint}: {check.reasonCodes.join(", ")}
                            {check.suspectedDuplicateId
                              ? ` · câu nghi trùng ${check.suspectedDuplicateId}`
                              : ""}
                          </p>
                        ))}
                      </details>
                      {(batch.status === "FINAL_CHECKED" ||
                        batch.status === "PARTIALLY_IMPORTED") &&
                        item.status === "SECOND_APPROVED" &&
                        item.checkResults?.some((check) => {
                          const marker = item.checkResults?.find(
                            (c) =>
                              c.checkpoint === "C3" &&
                              c.reasonCodes.includes("INDEPENDENT_ANSWER_CHECKED"),
                          );
                          const accepted = item.reviewEvents?.[0]?.createdAt;
                          return (
                            check.checkpoint === "C3" &&
                            check.level === "SOFT" &&
                            marker &&
                            new Date(check.checkedAt) >= new Date(marker.checkedAt) &&
                            (!accepted || new Date(accepted) < new Date(check.checkedAt))
                          );
                        }) && (
                          <div className="mt-2 flex gap-2">
                            <label>
                              Lý do loại câu{" "}
                              <input
                                value={rejectComments[item.id] ?? ""}
                                onChange={(event) =>
                                  setRejectComments({
                                    ...rejectComments,
                                    [item.id]: event.target.value,
                                  })
                                }
                                className="border p-1"
                              />
                            </label>
                            <button
                              disabled={actionBusy}
                              onClick={() =>
                                void action(
                                  `/item-batches/${batchId}/items/${item.id}/flag-decision`,
                                  { decision: "IMPORT" },
                                )
                              }
                              className="rounded border px-2 py-1 text-blue-700"
                            >
                              Chấp nhận cờ
                            </button>
                            <button
                              disabled={actionBusy || !rejectComments[item.id]?.trim()}
                              onClick={() =>
                                void action(
                                  `/item-batches/${batchId}/items/${item.id}/flag-decision`,
                                  {
                                    decision: "REJECT",
                                    comment: (rejectComments[item.id] ?? "").trim(),
                                  },
                                )
                              }
                              className="rounded border px-2 py-1 text-red-700"
                            >
                              Loại câu
                            </button>
                          </div>
                        )}
                    </td>
                    <td className="p-4">{item.administrativelyCancelled ? "Hủy hành chính" : batchStatusLabels[item.status] || item.status}</td>
                    <td className="p-4">{item.reviewer?.fullName || "Chưa giao"}</td>
                    <td className="p-4">{item.confirmer?.fullName || "Chưa giao"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 border-t p-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded px-3 py-2 disabled:opacity-40"
          >
            Trước
          </button>
          <span>Trang {page}</span>
          <button
            type="button"
            disabled={page * limit >= total}
            onClick={() => setPage(page + 1)}
            className="rounded px-3 py-2 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </section>
    </div>
  );
}
