"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, apiUpload } from "@/lib/api/client";

const reasonLabels: Record<string, string> = {
  CONTENT_REQUIRED: "Thi?u n?i dung c?u h?i",
  EXPLANATION_REQUIRED: "Thi?u gi?i th?ch",
  OPTIONS_INVALID: "C?n ?? b?n l?a ch?n",
  OPTIONS_DUPLICATE: "C?c l?a ch?n b? tr?ng",
  ANSWER_INVALID: "??p ?n ph?i l? A, B, C ho?c D",
  SKILL_INVALID: "K? n?ng kh?ng h?p l?",
  CEFR_INVALID: "M?c CEFR kh?ng h?p l?",
  TOPIC_INVALID: "Ch? ?? kh?ng h?p l?",
  IRT_B_INVALID: "?? kh? ph?i t? -4 ??n 4",
  DUPLICATE_IN_FILE: "C?u b? tr?ng trong t?p",
};
type Candidate = {
  content: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  skill: string;
  cefrTarget: string;
  topicTag: string;
  irtB: number;
};
type Entry = { candidate: Candidate; row: number; file: string };
export function ImportBatch() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Entry[]>([]);
  const [notice, setNotice] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const errors: string[] = [];
    const additions: Entry[] = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        const result = await apiUpload<{
          rows: Array<{ row: number; candidate: Candidate }>;
          rejected: Array<{ row: number; reasons: string[] }>;
        }>("/item-batches/import/preview", form);
        additions.push(...result.rows.map((r) => ({ ...r, file: file.name })));
        errors.push(
          ...result.rejected.map(
            (r) =>
              `${file.name}, dòng ${r.row}: ${r.reasons.map((code) => reasonLabels[code] ?? code).join(", ")}`,
          ),
        );
      }
      const keys = new Set(
        rows.map((r) =>
          r.candidate.content.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(),
        ),
      );
      const unique: Entry[] = [];
      for (const entry of additions) {
        const key = entry.candidate.content
          .normalize("NFKC")
          .trim()
          .replace(/\s+/g, " ")
          .toLowerCase();
        if (keys.has(key)) errors.push(`${entry.file}, dòng ${entry.row}: câu đã có trong lưới`);
        else {
          keys.add(key);
          unique.push(entry);
        }
      }
      setRows((old) => [...old, ...unique]);
      setNotice(errors);
    } catch (e) {
      setNotice([e instanceof Error ? e.message : "Không đọc được tệp"]);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setNotice([]);
    try {
      const result = await apiRequest<{ batchId: string }>("/item-batches/import/save", {
        method: "POST",
        body: { name, rows: rows.map((r) => r.candidate) },
        timeoutMs: 60000,
      });
      router.push(`/admin/item-batches/${result.batchId}`);
    } catch (e) {
      setNotice([e instanceof Error ? e.message : "Không thể lưu lô"]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Nhập lô câu hỏi từ Excel</h1>
      <p>
        Các cột theo thứ tự: Skill, CEFR, Topic, Câu hỏi, A, B, C, D, Đáp án, Giải thích, Độ khó.
        Dòng đầu là tiêu đề.
      </p>
      <label className="block">
        Tên lô{" "}
        <input
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border p-2"
        />
      </label>
      <label className="block">
        Chọn tệp .xlsx{" "}
        <input
          type="file"
          accept=".xlsx"
          multiple
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {notice.length > 0 && (
        <div role="alert" className="rounded bg-amber-50 p-4">
          <p>Các dòng không được thêm:</p>
          <ul>
            {notice.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <p>{rows.length} câu trong lưới tạm</p>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={`${row.file}-${row.row}-${index}`} className="rounded bg-white p-3">
            <p>{row.candidate.content}</p>
            <p className="text-sm">
              {row.file}, dòng {row.row} · {row.candidate.skill} · {row.candidate.cefrTarget}
            </p>
            <button
              type="button"
              className="text-red-700 underline"
              onClick={() => setRows((old) => old.filter((_, i) => i !== index))}
            >
              Bỏ dòng
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || !rows.length}
        onClick={save}
        className="rounded bg-blue-700 p-2 text-white disabled:opacity-50"
      >
        {busy ? "Đang xử lý..." : "Lưu lô"}
      </button>
    </main>
  );
}
