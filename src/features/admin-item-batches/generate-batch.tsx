"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
export function GenerateBatch() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("GRAMMAR");
  const [cefrTarget, setCefr] = useState("A2");
  const [topicTag, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest<{ batchId: string }>("/item-batches/generate", {
        method: "POST",
        body: { name, skill, cefrTarget, topicTag, count },
        timeoutMs: 110000,
      });
      router.push(`/admin/item-batches/${result.batchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo lô");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl bg-white p-6">
      <h1 className="text-2xl font-semibold">Tạo lô câu hỏi bằng AI</h1>
      <p>Nhập thông tin lô. Câu hỏi cần qua kiểm tra trước khi giao giảng viên.</p>
      <label className="block">
        Tên lô{" "}
        <input
          className="block w-full rounded border p-2"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        Kỹ năng{" "}
        <select
          className="block w-full rounded border p-2"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        >
          <option value="GRAMMAR">Ngữ pháp</option>
          <option value="VOCABULARY">Từ vựng</option>
        </select>
      </label>
      <label className="block">
        CEFR{" "}
        <select
          className="block w-full rounded border p-2"
          value={cefrTarget}
          onChange={(e) => setCefr(e.target.value)}
        >
          {["PRE_A1", "A1", "A2", "B1", "B2", "C1_PLUS"].map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Chủ đề (không bắt buộc){" "}
        <input
          className="block w-full rounded border p-2"
          maxLength={50}
          value={topicTag}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>
      <label className="block">
        Số câu{" "}
        <input
          className="block w-full rounded border p-2"
          type="number"
          min={1}
          max={20}
          required
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? "Đang tạo lô..." : "Tạo lô"}
      </button>
    </form>
  );
}
