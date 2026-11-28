"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

type Teacher = { id: string; fullName: string; role: string; isActive: boolean };

export function BatchReassign({
  batchId,
  confirmerId,
  onSaved,
}: {
  batchId: string;
  confirmerId?: string | null;
  onSaved: () => void;
}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [newConfirmer, setNewConfirmer] = useState("");
  const [confirmerReason, setConfirmerReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      try {
        const first = await apiRequest<{ items: Teacher[]; total: number }>("/teachers", {
          query: { page: 1, pageSize: 100 },
          signal: abort.signal,
        });
        const pages = await Promise.all(
          Array.from({ length: Math.max(0, Math.ceil(first.total / 100) - 1) }, (_, i) =>
            apiRequest<{ items: Teacher[] }>("/teachers", {
              query: { page: i + 2, pageSize: 100 },
              signal: abort.signal,
            }),
          ),
        );
        setTeachers(
          [first, ...pages]
            .flatMap((page) => page.items)
            .filter((teacher) => teacher.role === "TEACHER"),
        );
      } catch (error) {
        if (!abort.signal.aborted)
          setMessage(error instanceof Error ? error.message : "Không tải được giảng viên.");
      }
    }
    void load();
    return () => abort.abort();
  }, []);
  async function submit() {
    if (!from || !to || from === to || !reason.trim()) {
      setMessage("Chọn hai giảng viên khác nhau và nhập lý do.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await apiRequest<{ reassigned: number }>(`/item-batches/${batchId}/reassign`, {
        method: "POST",
        body: { fromAssigneeId: from, toAssigneeId: to, reason: reason.trim() },
      });
      setMessage(`Đã giao lại ${result.reassigned} câu DRAFT.`);
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể giao lại.");
    } finally {
      setBusy(false);
    }
  }
  async function changeConfirmer() {
    if (
      !newConfirmer ||
      !confirmerReason.trim() ||
      !window.confirm("Đổi giảng viên xác nhận cho lô này?")
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      await apiRequest(`/item-batches/${batchId}/reassign-confirmer`, {
        method: "POST",
        body: { toConfirmerId: newConfirmer, reason: confirmerReason.trim() },
      });
      setMessage("Đã đổi giảng viên B; thông báo đang chờ gửi.");
      setNewConfirmer("");
      setConfirmerReason("");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đổi giảng viên B.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-xl bg-white p-4">
      <h2 className="font-semibold">Giao lại câu chưa duyệt</h2>
      <p className="text-sm">
        Chuyển toàn bộ câu DRAFT của GV A được chọn trong lô; hạn và GV B giữ nguyên. Đổi hạn riêng
        nếu cần.
      </p>
      <div className="flex flex-wrap gap-4">
        <label>
          GV A hiện tại{" "}
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="border p-2"
          >
            <option value="">Chọn giảng viên</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          GV A thay thế{" "}
          <select value={to} onChange={(event) => setTo(event.target.value)} className="border p-2">
            <option value="">Chọn giảng viên</option>
            {teachers
              .filter(
                (teacher) => teacher.isActive && teacher.id !== confirmerId && teacher.id !== from,
              )
              .map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="block">
        Lý do giao lại{" "}
        <textarea
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="block w-full rounded border p-2"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={busy || !from || !to || from === to || !reason.trim()}
        className="rounded bg-blue-700 p-2 text-white disabled:opacity-50"
      >
        Giao lại câu DRAFT
      </button>
      <h3 className="font-semibold">Đổi giảng viên xác nhận B</h3>
      <p className="text-sm">
        Giảng viên B mới phải khác mọi giảng viên A trong lô; hạn và kết quả đã duyệt được giữ
        nguyên.
      </p>
      <label className="block">
        GV B mới{" "}
        <select
          value={newConfirmer}
          onChange={(event) => setNewConfirmer(event.target.value)}
          className="rounded border p-2"
        >
          <option value="">Chọn giảng viên</option>
          {teachers
            .filter((teacher) => teacher.isActive && teacher.id !== confirmerId)
            .map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName}
              </option>
            ))}
        </select>
      </label>
      <label className="block">
        Lý do đổi B{" "}
        <textarea
          maxLength={500}
          value={confirmerReason}
          onChange={(event) => setConfirmerReason(event.target.value)}
          className="block w-full rounded border p-2"
        />
      </label>
      <button
        type="button"
        disabled={busy || !newConfirmer || !confirmerReason.trim()}
        onClick={() => void changeConfirmer()}
        className="rounded border px-3 py-2 disabled:opacity-50"
      >
        Đổi giảng viên B
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
