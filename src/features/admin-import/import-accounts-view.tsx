"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import {
  clearImportGrid,
  downloadImportTemplate,
  getImportGrid,
  getImportStatus,
  removeImportRow,
  saveImportGrid,
  uploadImportFile,
} from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/errors";
import type {
  AccountKind,
  ImportExistingRow,
  ImportGridRow,
  ImportRejectedRow,
  ImportSaveStatus,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { vi } from "@/messages/vi";
import { ExistingRowsDialog, RejectedRowsDialog, type WithFile } from "./import-issues-dialog";

const t = vi.accountImport;

/** Lỗi file import: backend trả thông điệp tiếng Việt cụ thể (sai tiêu đề, quá dòng…) nên hiện kèm cho Admin. */
function importErrorText(e: unknown): string {
  return e instanceof ApiError && e.code === "IMPORT_FILE_INVALID"
    ? `${vi.errors.IMPORT_FILE_INVALID} ${e.message}`
    : errorMessage(e);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Issues {
  rejected: WithFile<ImportRejectedRow>[];
  existing: WithFile<ImportExistingRow>[];
}
const NO_ISSUES: Issues = { rejected: [], existing: [] };

/**
 * Import tài khoản SV/GV bằng file (S19, UCADM08). Mỗi loại một bảng tạm riêng (Redis, khóa theo admin + loại).
 * Chỉ khi bấm Lưu mới ghi DB; Lưu chạy nền ở backend nên giao diện theo dõi tiến độ.
 */
export function ImportAccountsView({ initialKind }: { initialKind: AccountKind }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AccountKind>(initialKind);
  const [issues, setIssues] = useState<Issues>(NO_ISSUES);
  const [notes, setNotes] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const [existingOpen, setExistingOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dismissedResult, setDismissedResult] = useState(false);
  // Chỉ hiện kết quả của lần Lưu diễn ra trong lúc đang mở trang này; kết quả cũ còn trong Redis (1 giờ) không hiện lại
  const [watching, setWatching] = useState(false);
  const isStudent = kind === "STUDENT";

  const gridKey = ["import-grid", kind] as const;
  const gridQuery = useQuery({
    queryKey: gridKey,
    queryFn: ({ signal }) => getImportGrid(kind, signal),
  });
  const statusQuery = useQuery({
    queryKey: ["import-status", kind],
    queryFn: ({ signal }) => getImportStatus(kind, signal),
    // Theo dõi tiến độ khi tác vụ Lưu đang chạy nền
    refetchInterval: (q) => (q.state.data?.status === "PROCESSING" ? 1000 : false),
  });

  const grid: ImportGridRow[] = gridQuery.data?.grid ?? [];
  const status: ImportSaveStatus | undefined = statusQuery.data;
  const processing = status?.status === "PROCESSING";
  if (processing && !watching) setWatching(true); // trang mở lại giữa lúc đang Lưu nền: theo dõi tiếp tới khi xong
  const uploading = progress !== null;

  const switchKind = (next: AccountKind) => {
    setKind(next);
    setIssues(NO_ISSUES);
    setNotes([]);
    setDismissedResult(false);
    setWatching(false);
    router.replace(`/admin/users/import?kind=${next}`, { scroll: false });
  };

  const onFilesChosen = async (files: File[]) => {
    if (files.length === 0) return;
    setIssues(NO_ISSUES);
    setNotes([]);
    setDismissedResult(false);
    const collected: Issues = { rejected: [], existing: [] };
    const messages: string[] = [];
    for (const [i, file] of files.entries()) {
      setProgress({ done: i, total: files.length });
      try {
        const result = await uploadImportFile(kind, file);
        collected.rejected.push(...result.rejected.map((r) => ({ ...r, file: file.name })));
        collected.existing.push(...result.existing.map((r) => ({ ...r, file: file.name })));
        queryClient.setQueryData(gridKey, { grid: result.grid });
        messages.push(t.uploaded(file.name, result.added, result.ignoredDuplicates));
      } catch (e) {
        messages.push(`${t.uploadFailed(file.name)} ${importErrorText(e)}`);
      }
    }
    setProgress(null);
    setIssues(collected);
    setNotes(messages);
    if (fileInput.current) fileInput.current.value = "";
  };

  const deleteRow = async (rowKey: string) => {
    try {
      const result = await removeImportRow(kind, rowKey);
      queryClient.setQueryData(gridKey, { grid: result.grid });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const clearAll = async () => {
    try {
      await clearImportGrid(kind);
      queryClient.setQueryData(gridKey, { grid: [] });
      setConfirmClear(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const save = async () => {
    setDismissedResult(false);
    setWatching(true);
    try {
      await saveImportGrid(kind);
      await statusQuery.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
      if (e instanceof ApiError && e.code === "IMPORT_GRID_EXPIRED") {
        queryClient.setQueryData(gridKey, { grid: [] });
      }
    }
  };

  // Khi tác vụ nền kết thúc (DONE/FAILED): làm mới bảng và danh sách tài khoản, mỗi lần chuyển trạng thái một lần
  const finishedSignature =
    status && status.status !== "PROCESSING" && status.status !== "NONE"
      ? `${kind}:${status.status}:${status.processed}:${status.created ?? ""}`
      : null;
  useEffect(() => {
    if (!finishedSignature) return;
    void queryClient.invalidateQueries({ queryKey: ["import-grid", kind] });
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
  }, [finishedSignature, kind, queryClient]);

  const downloadTemplate = async () => {
    try {
      const { blob, filename } = await downloadImportTemplate(kind);
      saveBlob(blob, filename);
    } catch {
      toast.error(t.templateError);
    }
  };

  const failed = watching && status?.status === "FAILED" ? status : null;
  const done = watching && status?.status === "DONE" && !dismissedResult ? status : null;

  return (
    <div className="space-y-6" data-testid="import-accounts">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={isStudent ? "/admin/users/students" : "/admin/users/teachers"}>
            {t.backToAccounts}
          </Link>
        </Button>
      </div>

      <fieldset className="space-y-2" disabled={processing}>
        <legend className="text-sm font-medium">{t.kindLabel}</legend>
        <div
          role="radiogroup"
          aria-label={t.kindLabel}
          className="inline-flex rounded-lg bg-muted p-1"
        >
          {(["STUDENT", "TEACHER"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              data-testid={`import-kind-${k === "STUDENT" ? "student" : "teacher"}`}
              onClick={() => switchKind(k)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                kind === k ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {k === "STUDENT" ? t.kindStudent : t.kindTeacher}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label={t.uploadLabel}
            data-testid="import-file"
            disabled={uploading || processing}
            onChange={(e) => void onFilesChosen(Array.from(e.target.files ?? []))}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            data-testid={isStudent ? "import-template-student" : "import-template-teacher"}
            onClick={downloadTemplate}
          >
            {isStudent ? t.templateStudent : t.templateTeacher}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t.uploadHint}</p>
        {progress && (
          <p role="status" className="text-sm" data-testid="import-uploading">
            {t.uploading(progress.done + 1, progress.total)}
          </p>
        )}
        {notes.length > 0 && (
          <ul className="space-y-1 text-sm" data-testid="import-notes">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
        {(issues.rejected.length > 0 || issues.existing.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {issues.rejected.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                data-testid="import-rejected-open"
                onClick={() => setRejectedOpen(true)}
              >
                {t.rejectedButton(issues.rejected.length)}
              </Button>
            )}
            {issues.existing.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                data-testid="import-existing-open"
                onClick={() => setExistingOpen(true)}
              >
                {t.existingButton(issues.existing.length)}
              </Button>
            )}
          </div>
        )}
      </div>

      {processing && status?.status === "PROCESSING" && (
        <Alert data-testid="import-progress">
          <AlertDescription className="space-y-2">
            <p>
              {t.saving} {t.progress(status.processed, status.total)}
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={status.total}
              aria-valuenow={status.processed}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${status.total ? (status.processed / status.total) * 100 : 0}%` }}
              />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {done && (
        <Alert data-testid="import-result">
          <AlertDescription className="space-y-1">
            <p className="font-medium">{t.result(done.created ?? 0, done.queued ?? 0)}</p>
            <p className="text-muted-foreground">{t.resultNote}</p>
            <Button variant="ghost" size="sm" onClick={() => setDismissedResult(true)}>
              {t.dismiss}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {failed && !processing && (
        <Alert variant="destructive" data-testid="import-failed">
          <AlertDescription className="space-y-1">
            <p>{failed.error?.code === "CONFLICT" ? t.saveConflict : t.saveFailed}</p>
            {failed.error?.conflicts && failed.error.conflicts.length > 0 && (
              <ul className="list-disc pl-5">
                {failed.error.conflicts.map((c, i) => (
                  <li key={i}>
                    {t.conflictRow(
                      c.row,
                      c.field === "email"
                        ? t.existingReason.email
                        : isStudent
                          ? t.existingReason.studentCode
                          : t.existingReason.teacherCode,
                      c.value,
                    )}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold" data-testid="import-grid-title">
            {t.gridTitle(grid.length)}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={grid.length === 0 || processing}
              onClick={() => setConfirmClear(true)}
              data-testid="import-clear"
            >
              {t.clearAll}
            </Button>
            <Button
              disabled={grid.length === 0 || processing || uploading}
              onClick={save}
              data-testid="import-save"
            >
              {processing ? t.saving : vi.common.save}
            </Button>
          </div>
        </div>

        {gridQuery.isPending ? (
          <LoadingBlock rows={4} />
        ) : gridQuery.isError ? (
          <ErrorBlock error={gridQuery.error} onRetry={() => gridQuery.refetch()} />
        ) : grid.length === 0 ? (
          <EmptyBlock text={t.gridEmpty} />
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded-md border" data-testid="import-grid">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{t.colIndex}</TableHead>
                  <TableHead>{isStudent ? t.colStudentCode : t.colTeacherCode}</TableHead>
                  <TableHead>{t.colName}</TableHead>
                  <TableHead>{t.colEmail}</TableHead>
                  <TableHead className="text-right">{t.colAction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grid.map((row, i) => (
                  <TableRow key={row.rowKey} data-testid={`import-row-${row.rowKey}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processing}
                        data-testid={`import-delete-${row.rowKey}`}
                        onClick={() => deleteRow(row.rowKey)}
                      >
                        {t.deleteRow}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <RejectedRowsDialog
        rows={issues.rejected}
        open={rejectedOpen}
        onOpenChange={setRejectedOpen}
      />
      <ExistingRowsDialog
        rows={issues.existing}
        kind={kind}
        open={existingOpen}
        onOpenChange={setExistingOpen}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t.confirmClearTitle}
        description={t.confirmClearBody}
        destructive
        onConfirm={clearAll}
      />
    </div>
  );
}
