"use client";

import Link from "next/link";
import { BatchDeadlines } from "./batch-deadlines";
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
  };
  items: Array<{
    id: string;
    content: string;
    status: string;
    options?: Record<string, string>;
    correctAnswer?: string;
    explanation?: { content: string } | null;
    checkResults?: Array<{
      checkpoint: string;
      level: string;
      reasonCodes: string[];
      suspectedDuplicateId: string | null;
    }>;
    reviewer: { fullName: string | null } | null;
    confirmer: { fullName: string | null } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  statusCounts: Array<{ status: string; count: number }>;
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
};

export function BatchDetailView({ batchId }: { batchId: string }) {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["admin-item-batch", batchId, page],
    queryFn: ({ signal }) =>
      apiRequest<BatchDetail>(`/item-batches/${encodeURIComponent(batchId)}`, {
        query: { page, limit: 20 },
        signal,
      }),
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <EmptyBlock text="Không có dữ liệu lô câu hỏi." />;
  const { batch, items, total, limit, statusCounts } = q.data;
  const counts = new Map(statusCounts.map((entry) => [entry.status, entry.count]));
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
          <button
            disabled
            title="Chức năng đang phát triển"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-500"
          >
            Kiểm tra cuối
          </button>
        </div>
      </section>
      {batch.status === "IN_REVIEW" && (
        <BatchDeadlines
          batchId={batchId}
          onSaved={() => {
            void q.refetch();
          }}
        />
      )}
      {batch.status === "CHECKING" && (
        <p role="status" className="rounded bg-amber-50 p-4">
          Lô chưa hoàn tất kiểm tra chất lượng; hiện chưa thể giao việc.
        </p>
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
                        <summary className="cursor-pointer text-blue-700">Xem chi ti?t</summary>
                        <ul>
                          {Object.entries(item.options ?? {}).map(([key, value]) => (
                            <li key={key}>
                              {key}. {value}
                              {key === item.correctAnswer ? " ? ??p ?n" : ""}
                            </li>
                          ))}
                        </ul>
                        {item.explanation?.content && <p>Gi?i th?ch: {item.explanation.content}</p>}
                        {item.checkResults?.map((check, i) => (
                          <p key={i}>
                            {check.checkpoint}: {check.reasonCodes.join(", ")}
                            {check.suspectedDuplicateId
                              ? ` ? c?u nghi tr?ng ${check.suspectedDuplicateId}`
                              : ""}
                          </p>
                        ))}
                      </details>
                    </td>
                    <td className="p-4">{batchStatusLabels[item.status] || item.status}</td>
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
