"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiDownload, apiRequest, apiUpload } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";

type Grid =
  paths["/api/v1/item-batches/import/grid"]["get"]["responses"][200]["content"]["application/json"];
type Upload =
  paths["/api/v1/item-batches/import/upload"]["post"]["responses"][201]["content"]["application/json"];
type GridState = Pick<Grid, "rows" | "operationId"> & { expired?: boolean };

export function ImportBatch() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grid, setGrid] = useState<GridState>({ rows: [], operationId: null });
  const [notice, setNotice] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [created, setCreated] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    apiRequest<Grid>("/item-batches/import/grid")
      .then((result) => {
        if (active) {
          setGrid(result);
          if (result.expired) setNotice(["Lưới đã hết hạn, vui lòng tải lại tệp."]);
        }
      })
      .catch((error) => {
        if (active) setNotice([error instanceof Error ? error.message : "Không tải được lưới"]);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const messages: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        const result = await apiUpload<Upload>("/item-batches/import/upload", form);
        setGrid(result);
        if (result.duplicates)
          messages.push(`${file.name}: ${result.duplicates} câu đã có trong lưới.`);
        messages.push(
          ...result.rejected.map(
            (entry) => `${file.name}, dòng ${entry.row}: ${entry.reasons.join(", ")}`,
          ),
        );
      }
      setNotice(messages);
    } catch (error) {
      setNotice([error instanceof Error ? error.message : "Không đọc được tệp"]);
    } finally {
      setBusy(false);
    }
  }
  async function remove(rowKey?: string) {
    setBusy(true);
    try {
      setGrid(
        await apiRequest<Grid>(`/item-batches/import/grid${rowKey ? `/${rowKey}` : ""}`, {
          method: "DELETE",
        }),
      );
      setNotice([]);
    } catch (error) {
      setNotice([error instanceof Error ? error.message : "Không cập nhật được lưới"]);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!grid.operationId || !window.confirm(`Lưu ${grid.rows.length} câu vào lô?`)) return;
    setBusy(true);
    setNotice([]);
    try {
      const result = await apiRequest<
        paths["/api/v1/item-batches/import/save"]["post"]["responses"][201]["content"]["application/json"]
      >("/item-batches/import/save", {
        method: "POST",
        body: { name, operationId: grid.operationId },
        timeoutMs: 60000,
      });
      const ids = result.batchIds ?? [result.batchId];
      if (ids.length === 1) router.push(`/admin/item-batches/${result.batchId}`);
      else {
        setGrid({ rows: [], operationId: null });
        setCreated(ids);
      }
    } catch (error) {
      setNotice([error instanceof Error ? error.message : "Không thể lưu lô. Hãy thử lại."]);
    } finally {
      setBusy(false);
    }
  }
  async function downloadTemplate() {
    try {
      const result = await apiDownload("/item-batches/import/template");
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice([error instanceof Error ? error.message : "Không tải được mẫu Excel"]);
    }
  }
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Nhập lô câu hỏi từ Excel</h1>
      <p>
        Các cột: Skill, CEFR, Topic, Câu hỏi, A, B, C, D, Đáp án, Giải thích, Độ khó. Dòng đầu là
        tiêu đề.
      </p>
      <p>Danh sách trên 50 câu sẽ được chia thành nhiều lô; mỗi lô có tối đa 250 lượt gọi AI.</p>
      {created.length > 0 && (
        <div role="status">
          <p>Đã tạo {created.length} lô:</p>
          <ul>
            {created.map((id, index) => (
              <li key={id}>
                <Link className="underline" href={`/admin/item-batches/${id}`}>
                  Lô {index + 1}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" onClick={() => void downloadTemplate()} className="underline">
        Tải mẫu Excel
      </button>
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
          <ul>
            {notice.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <p>{grid.rows.length} câu trong lưới tạm</p>
      <div className="space-y-2">
        {grid.rows.map((row) => (
          <div key={row.rowKey} className="rounded bg-white p-3">
            <p>{row.candidate.content}</p>
            <p className="text-sm">
              {row.candidate.skill} · {row.candidate.cefrTarget}
            </p>
            <button
              type="button"
              disabled={busy}
              className="text-red-700 underline"
              onClick={() => void remove(row.rowKey)}
            >
              Bỏ dòng
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || !grid.rows.length}
        onClick={() => void remove()}
        className="mr-3 underline disabled:opacity-50"
      >
        Xóa lưới
      </button>
      <button
        type="button"
        disabled={busy || !grid.rows.length}
        onClick={save}
        className="rounded bg-blue-700 p-2 text-white disabled:opacity-50"
      >
        {busy ? "Đang xử lý..." : "Lưu lô"}
      </button>
    </main>
  );
}
