"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { batchStatusLabels } from "./batch-detail";

interface BatchList {
  data: Array<{
    id: string;
    name: string | null;
    source: string;
    status: string;
    _count: { items: number };
  }>;
  total: number;
  limit: number;
}

export function BatchListView() {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["admin-item-batches", page],
    queryFn: ({ signal }) =>
      apiRequest<BatchList>("/item-batches", { query: { page, limit: 20 }, signal }),
  });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lô câu hỏi</h1>
        <Link className="rounded border px-4 py-2" href="/admin/item-batches/import">
          Nhập Excel
        </Link>
        <Link
          className="rounded bg-blue-700 px-4 py-2 text-white"
          href="/admin/item-batches/generate"
        >
          Tạo lô AI
        </Link>
      </div>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.error ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.data.length === 0 ? (
        <EmptyBlock text="Không có lô câu hỏi." />
      ) : (
        <section className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">Lô câu hỏi</th>
                <th className="p-4">Nguồn</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Số câu</th>
                <th className="p-4">
                  <span className="sr-only">Xem chi tiết</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((batch) => (
                <tr key={batch.id} className="border-t">
                  <td className="p-4">{batch.name || batch.id}</td>
                  <td className="p-4">
                    {batch.source === "AI_GENERATED" ? "AI sinh" : "Import file"}
                  </td>
                  <td className="p-4">{batchStatusLabels[batch.status] || batch.status}</td>
                  <td className="p-4">{batch._count.items}</td>
                  <td className="p-4">
                    <Link
                      className="text-blue-700 underline"
                      href={`/admin/item-batches/${encodeURIComponent(batch.id)}`}
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {q.data && (
        <div className="flex justify-end gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded px-3 py-2 disabled:opacity-40"
          >
            Trước
          </button>
          <span className="py-2">Trang {page}</span>
          <button
            disabled={page * q.data.limit >= q.data.total}
            onClick={() => setPage(page + 1)}
            className="rounded px-3 py-2 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
