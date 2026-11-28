"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { notifyError } from "@/lib/api/notify-error";
import { saveBlob } from "@/lib/download";
import {
  clearRosterGrid,
  downloadRosterTemplate,
  getRosterGrid,
  removeRosterRow,
  saveRosterGrid,
  uploadRoster,
} from "./api";

type Upload = Awaited<ReturnType<typeof uploadRoster>>;
export function RosterImportView({ roundId }: { roundId: string }) {
  const client = useQueryClient();
  const key = ["roster-grid", roundId];
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<Upload | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const grid = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getRosterGrid(roundId, signal),
    retry: false,
  });
  const upload = useMutation({
    mutationFn: (value: File) => uploadRoster(roundId, value),
    onSuccess: (data) => {
      client.setQueryData(key, { grid: data.grid, operationId: data.operationId });
      setUploadResult(data);
      setSaved(null);
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => removeRosterRow(roundId, studentId),
    onSuccess: (data) => client.setQueryData(key, data),
    onError: notifyError,
  });
  const clear = useMutation({
    mutationFn: () => clearRosterGrid(roundId),
    onSuccess: () => {
      client.setQueryData(key, { grid: [], operationId: null });
      setUploadResult(null);
      setSaved(null);
    },
    onError: notifyError,
  });
  const save = useMutation({
    mutationFn: (operationId: string) => saveRosterGrid(roundId, operationId),
    onSuccess: async (data) => {
      client.setQueryData(key, { grid: [], operationId: null });
      setSaved(data.added);
      setUploadResult(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["exam-rounds"] }),
        client.invalidateQueries({ queryKey: ["exam-round", roundId] }),
        client.invalidateQueries({ queryKey: ["round-participants", roundId] }),
      ]);
    },
    onError: notifyError,
  });
  const busy = upload.isPending || remove.isPending || clear.isPending || save.isPending;
  const expired = grid.error instanceof ApiError && grid.error.code === "IMPORT_GRID_EXPIRED";
  const rows = grid.data?.grid ?? [];
  return (
    <div className="space-y-6">
      <Link href={`/admin/exam-rounds/${roundId}`} className="text-primary hover:underline">
        ← Chi tiết kỳ thi
      </Link>
      <h1 className="text-3xl font-bold">Nhập danh sách thí sinh</h1>
      <p>
        Tải file .xlsx có cột MSSV và Ghi chú (tùy chọn). Dữ liệu chỉ được ghi vào kỳ khi bấm Lưu.
      </p>
      <Button
        variant="outline"
        disabled={downloading}
        onClick={async () => {
          setDownloading(true);
          try {
            const result = await downloadRosterTemplate(roundId);
            saveBlob(result.blob, result.filename);
          } catch (error) {
            notifyError(error);
          } finally {
            setDownloading(false);
          }
        }}
      >
        {downloading ? "Đang tải mẫu..." : "Tải file mẫu"}
      </Button>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          File Excel
          <input
            className="mt-1 block"
            type="file"
            accept=".xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <Button disabled={!file || busy} onClick={() => file && upload.mutate(file)}>
          {upload.isPending ? "Đang tải..." : "Tải lên"}
        </Button>
      </div>
      {uploadResult && (
        <div role="status">
          <p>
            Đã thêm {uploadResult.added} dòng; bỏ qua {uploadResult.ignoredDuplicates} dòng đã có
            trong lưới.
          </p>
          {uploadResult.rejected.length > 0 && (
            <>
              <p>Các dòng không được thêm:</p>
              <ul className="list-disc pl-5">
                {uploadResult.rejected.map((row, index) => (
                  <li key={`${row.row}-${index}`}>
                    Dòng {row.row}: {row.studentCode || "(trống)"} — {row.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {saved !== null && <p role="status">Đã lưu {saved} thí sinh vào kỳ thi.</p>}
      {grid.isPending ? (
        <LoadingBlock />
      ) : grid.isError ? (
        <div className="space-y-3">
          <ErrorBlock error={grid.error} onRetry={() => grid.refetch()} />
          {expired && (
            <Button variant="outline" disabled={busy} onClick={() => clear.mutate()}>
              Xóa lưới hết hạn
            </Button>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold">Lưới tạm ({rows.length})</h2>
          {rows.length === 0 ? (
            <p>Chưa có thí sinh trong lưới.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>MSSV</th>
                    <th>Ghi chú</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.studentId} className="border-t">
                      <td className="py-2">{row.studentCode}</td>
                      <td>{row.note || "—"}</td>
                      <td>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => remove.mutate(row.studentId)}
                        >
                          Xóa {row.studentCode}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!rows.length || !grid.data?.operationId || busy}
              onClick={() => {
                if (
                  grid.data?.operationId &&
                  window.confirm(`Lưu ${rows.length} thí sinh vào kỳ thi?`)
                )
                  save.mutate(grid.data.operationId);
              }}
            >
              {save.isPending ? "Đang lưu..." : "Lưu danh sách"}
            </Button>
            <Button
              variant="outline"
              disabled={!rows.length || busy}
              onClick={() => {
                if (window.confirm("Xóa toàn bộ lưới tạm?")) clear.mutate();
              }}
            >
              Xóa lưới
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
