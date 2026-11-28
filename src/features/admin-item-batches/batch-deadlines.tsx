"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
export function BatchDeadlines({ batchId, onSaved }: { batchId: string; onSaved: () => void }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!first || !second || !reason.trim()) {
      setMessage("Chọn ngày giờ cho cả hai vòng và nhập lý do đổi hạn.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await apiRequest(`/item-batches/${batchId}/deadlines`, {
        method: "PATCH",
        body: {
          firstDueAt: new Date(first).toISOString(),
          secondDueAt: new Date(second).toISOString(),
          reason: reason.trim(),
        },
      });
      setMessage("Đã cập nhật hạn cho các công việc chưa hoàn tất.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật hạn.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-xl bg-white p-4">
      <h2 className="font-semibold">Điều chỉnh hạn chung</h2>
      <p className="text-sm">Hạn mới áp dụng cho công việc chưa xử lý của từng vòng.</p>
      <div className="flex flex-wrap gap-4">
        <label>
          Hạn vòng A{" "}
          <input
            type="datetime-local"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="border p-2"
          />
        </label>
        <label>
          Hạn vòng B{" "}
          <input
            type="datetime-local"
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            className="border p-2"
          />
        </label>
      </div>
      <label className="block">
        Lý do đổi hạn{" "}
        <input
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border p-2"
        />
      </label>
      <button
        onClick={save}
        disabled={busy}
        className="rounded bg-blue-700 p-2 text-white disabled:opacity-50"
      >
        Lưu hạn
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
