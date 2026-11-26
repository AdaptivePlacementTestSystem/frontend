"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";

type Task = {
  id: string;
  batchId: string;
  batchName: string | null;
  role: "A" | "B";
  content: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string | null;
  flags: { reasonCodes: string[] }[];
  firstReview: { dueAt?: string; originalSnapshot?: unknown } | null;
  secondReview: { dueAt?: string } | null;
};

function EditQuestion({ item, onSaved }: { item: Task; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [options, setOptions] = useState(item.options);
  const [correctAnswer, setCorrectAnswer] = useState(item.correctAnswer);
  const [explanation, setExplanation] = useState(item.explanation ?? "");
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher-review/${item.id}`, {
        method: "PATCH",
        body: { content, options, correctAnswer, explanation },
      }),
    onSuccess: () => {
      setEditing(false);
      onSaved();
    },
  });
  if (!editing)
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded border px-4 py-2 text-sm font-medium"
      >
        Sửa câu hỏi
      </button>
    );
  return (
    <form
      className="space-y-3 rounded-lg bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <label className="block text-sm">
        Nội dung
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 w-full rounded border bg-white p-2"
        />
      </label>
      {["A", "B", "C", "D"].map((key) => (
        <label key={key} className="block text-sm">
          Phương án {key}
          <input
            required
            value={options[key] ?? ""}
            onChange={(e) => setOptions({ ...options, [key]: e.target.value })}
            className="mt-1 w-full rounded border bg-white p-2"
          />
        </label>
      ))}
      <label className="block text-sm">
        Đáp án đúng
        <select
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          className="ml-2 rounded border bg-white p-2"
        >
          {["A", "B", "C", "D"].map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Giải thích
        <textarea
          required
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="mt-1 w-full rounded border bg-white p-2"
        />
      </label>
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-700">
          Không lưu được. Kiểm tra nội dung và câu trùng rồi thử lại.
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={mutation.isPending}
          className="rounded bg-blue-700 px-4 py-2 text-sm text-white"
        >
          Lưu thay đổi
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded border px-4 py-2 text-sm"
        >
          Hủy sửa
        </button>
      </div>
    </form>
  );
}

export function ReviewQueue() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["teacher-review"],
    queryFn: ({ signal }) => apiRequest<Task[]>("/teacher-review", { signal }),
  });
  const decision = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiRequest(`/teacher-review/${id}/decision`, { method: "POST", body: { action } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-review"] }),
  });
  const confirmAll = useMutation({
    mutationFn: (batchId: string) =>
      apiRequest(`/teacher-review/${batchId}/confirm-all`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-review"] }),
  });
  if (query.isPending) return <LoadingBlock />;
  if (query.isError) return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold">Hộp việc thẩm định câu hỏi</h1>
      <p className="text-sm text-slate-600">
        Câu vòng B xuất hiện khi giảng viên A đã xử lý hết phần được giao trong lô.
      </p>
      {(decision.isError || confirmAll.isError) && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-700">
          Không thể lưu quyết định. Vui lòng tải lại và thử lại.
        </p>
      )}
      {query.data.length === 0 && (
        <p className="rounded-lg bg-white p-5 text-slate-500">Hiện không có câu hỏi chờ xử lý.</p>
      )}
      {Array.from(
        new Map(
          query.data
            .filter((item) => item.role === "B")
            .map((item) => [item.batchId, item.batchName]),
        ).entries(),
      ).map(([batchId, name]) => (
        <div
          key={batchId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue-50 p-4 text-sm"
        >
          <span>
            Lô: <strong>{name || batchId}</strong>
          </span>
          <button
            type="button"
            disabled={confirmAll.isPending || decision.isPending}
            onClick={() => {
              if (window.confirm(`Xác nhận tất cả câu sẵn sàng trong lô ${name || batchId}?`))
                confirmAll.mutate(batchId);
            }}
            className="rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Xác nhận tất cả câu sẵn sàng
          </button>
        </div>
      ))}
      {query.data.map((item) => {
        const due = (item.role === "A" ? item.firstReview : item.secondReview)?.dueAt;
        return (
          <article key={item.id} className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-600">
              <span>
                {item.batchName || "Lô câu hỏi"} · Vai {item.role}
              </span>
              {due && <span>Hạn: {new Date(due).toLocaleString("vi-VN")}</span>}
            </div>
            <h2 className="font-semibold">{item.content}</h2>
            <ul className="space-y-1 text-sm">
              {Object.entries(item.options).map(([key, value]) => (
                <li
                  key={key}
                  className={key === item.correctAnswer ? "font-semibold text-green-700" : ""}
                >
                  {key}. {value}
                  {key === item.correctAnswer ? " ✓" : ""}
                </li>
              ))}
            </ul>
            {item.explanation && (
              <p className="rounded bg-slate-50 p-3 text-sm">Giải thích: {item.explanation}</p>
            )}
            {item.flags.length > 0 && (
              <p className="text-sm text-amber-700">
                Cờ kiểm tra: {item.flags.flatMap((flag) => flag.reasonCodes).join(", ")}
              </p>
            )}
            {item.role === "B" && item.firstReview?.originalSnapshot != null && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">A đã sửa — xem bản gốc</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3">
                  {JSON.stringify(item.firstReview.originalSnapshot, null, 2)}
                </pre>
              </details>
            )}
            {item.role === "A" && (
              <EditQuestion
                item={item}
                onSaved={() => void queryClient.invalidateQueries({ queryKey: ["teacher-review"] })}
              />
            )}
            <div className="flex gap-3">
              <button
                disabled={decision.isPending}
                onClick={() =>
                  decision.mutate({
                    id: item.id,
                    action: item.role === "A" ? "APPROVE" : "CONFIRM",
                  })
                }
                className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {item.role === "A" ? "Duyệt" : "Xác nhận"}
              </button>
              <button
                disabled={decision.isPending}
                onClick={() =>
                  decision.mutate({ id: item.id, action: item.role === "A" ? "REJECT" : "REMOVE" })
                }
                className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                {item.role === "A" ? "Từ chối" : "Loại bỏ"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
