"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";

type Stats =
  paths["/api/v1/item-batches/rejected-stats"]["get"]["responses"][200]["content"]["application/json"];
const reasons: Record<string, string> = {
  DUPLICATE_EXACT: "T1 — Trùng chính xác",
  DUPLICATE_NEAR: "T2 — Trùng gần",
};
export function RejectedStats() {
  const [dimension, setDimension] = useState("reason");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["ai-rejected-stats", dimension, page],
    queryFn: ({ signal }) =>
      apiRequest<Stats>("/item-batches/rejected-stats", {
        query: { dimension, page, limit: 20 },
        signal,
      }),
  });
  return (
    <main className="space-y-5">
      <Link href="/admin/item-batches" className="underline">
        ← Danh sách lô
      </Link>
      <h1 className="text-2xl font-semibold">Thống kê câu bị AI loại</h1>
      <p>Số câu được đếm một lần trong từng nhóm; một câu có thể xuất hiện ở nhiều nhóm lý do.</p>
      <label>
        Nhóm theo{" "}
        <select
          value={dimension}
          onChange={(event) => {
            setDimension(event.target.value);
            setPage(1);
          }}
          className="rounded border p-2"
        >
          <option value="reason">Lý do kiểm tra</option>
          <option value="batch">Lô câu hỏi</option>
          <option value="reviewer">Giảng viên được giao</option>
        </select>
      </label>
      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data?.data.length ? (
        <EmptyBlock text="Không có câu bị AI loại trong nhóm này." />
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">Nhóm</th>
              <th className="p-2">Số câu</th>
            </tr>
          </thead>
          <tbody>
            {query.data.data.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="p-2">
                  {dimension === "reason" ? (reasons[row.label] ?? row.label) : row.label}
                </td>
                <td className="p-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex gap-3">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="underline disabled:opacity-40"
        >
          Trước
        </button>
        <span>Trang {page}</span>
        <button
          disabled={!query.data?.hasMore}
          onClick={() => setPage(page + 1)}
          className="underline disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </main>
  );
}
