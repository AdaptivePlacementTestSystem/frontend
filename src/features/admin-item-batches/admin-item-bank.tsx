"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { batchStatusLabels } from "./batch-detail";

type BankItems = paths["/api/v1/items"]["get"]["responses"][200]["content"]["application/json"];
type BankItem = BankItems[number];

/** Dùng hợp đồng GET /items của develop hiện tại; cần rà khi nhánh item-bank được merge. */
export function AdminItemBank() {
  const [status, setStatus] = useState("FINAL_APPROVED");
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [cefr, setCefr] = useState("");
  const [selected, setSelected] = useState<BankItem | null>(null);
  const q = useQuery({
    queryKey: ["admin-bank-items", status],
    queryFn: ({ signal }) =>
      apiRequest<BankItems>("/items", { query: { status: status || undefined }, signal }),
  });
  const items = useMemo(() => {
    if (!Array.isArray(q.data)) return [];
    const term = search.trim().toLocaleLowerCase("vi");
    return q.data.filter(
      (item) =>
        (!term || `${item.content} ${item.id}`.toLocaleLowerCase("vi").includes(term)) &&
        (!skill || item.skill === skill) &&
        (!cefr || item.cefrTarget === cefr),
    );
  }, [q.data, search, skill, cefr]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Ngân hàng câu hỏi</h1>
        <p className="mt-1 text-sm text-slate-600">Danh sách câu hỏi theo trạng thái</p>
      </header>
      <section className="flex flex-wrap gap-4 rounded-xl bg-white p-4 shadow-sm">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
          Tìm theo nội dung hoặc mã câu
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kỹ năng
          <select
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">Tất cả</option>
            <option value="VOCABULARY">Từ vựng</option>
            <option value="GRAMMAR">Ngữ pháp</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          CEFR
          <select
            value={cefr}
            onChange={(event) => setCefr(event.target.value)}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">Tất cả</option>
            {["PRE_A1", "A1", "A2", "B1", "B2", "C1_PLUS"].map((level) => (
              <option key={level} value={level}>
                {level === "PRE_A1" ? "Pre-A1" : level === "C1_PLUS" ? "C1+" : level}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Trạng thái
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border px-3 py-2"
          >
            <option value="FINAL_APPROVED">Đã vào ngân hàng</option>
            <option value="DRAFT">Chờ duyệt vòng 1</option>
            <option value="FIRST_APPROVED">Đã duyệt vòng 1</option>
            <option value="SECOND_APPROVED">Đã xác nhận vòng 2</option>
            <option value="REJECTED">Đã loại</option>
            <option value="AI_REJECTED">AI đã loại</option>
          </select>
        </label>
      </section>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.error ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : !Array.isArray(q.data) ? (
        <p role="alert">Dữ liệu ngân hàng câu hỏi không đúng định dạng.</p>
      ) : items.length === 0 ? (
        <EmptyBlock text="Không tìm thấy câu hỏi phù hợp." />
      ) : (
        <section className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">Câu hỏi</th>
                <th className="p-4">Kỹ năng</th>
                <th className="p-4">CEFR</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Độ khó</th>
                <th className="p-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="max-w-xl p-4">
                    <span className="block text-xs text-slate-500">{item.id}</span>
                    {item.content}
                  </td>
                  <td className="p-4">
                    {item.skill === "GRAMMAR"
                      ? "Ngữ pháp"
                      : item.skill === "VOCABULARY"
                        ? "Từ vựng"
                        : item.skill}
                  </td>
                  <td className="p-4">{item.cefrTarget}</td>
                  <td className="p-4">{batchStatusLabels[item.status] || item.status}</td>
                  <td className="p-4">
                    {typeof item.irtB === "number" ? item.irtB.toFixed(2) : "Chưa có"}
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="text-blue-700 underline"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {selected && (
        <section
          role="region"
          aria-label="Chi tiết câu hỏi"
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Chi tiết câu hỏi</h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-blue-700 underline"
            >
              Đóng
            </button>
          </div>
          <p className="mt-3">{selected.content}</p>
          <ul className="mt-3 space-y-1">
            {["A", "B", "C", "D"].map((key) => (
              <li key={key}>
                {key}. {selected.options?.[key] ?? "Chưa có"}
                {selected.correctAnswer === key ? " — Đáp án" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
