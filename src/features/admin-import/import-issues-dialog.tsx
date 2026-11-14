"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccountKind, ImportExistingRow, ImportRejectedRow } from "@/lib/api/types";
import { vi } from "@/messages/vi";

const t = vi.accountImport;

/** Dòng kèm tên file nguồn (nhiều file có thể được tải liên tiếp). */
export type WithFile<T> = T & { file: string };

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Popup "dòng bị loại": thiếu cột, email sai, trùng trong file (BR-03). */
export function RejectedRowsDialog({
  rows,
  ...base
}: BaseProps & { rows: WithFile<ImportRejectedRow>[] }) {
  return (
    <Dialog open={base.open} onOpenChange={base.onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="import-rejected-popup">
        <DialogHeader>
          <DialogTitle>{t.rejectedTitle}</DialogTitle>
          <DialogDescription>{t.rejectedIntro}</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colFile}</TableHead>
                <TableHead>{t.colRow}</TableHead>
                <TableHead>{t.colReason}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.file}-${r.row}-${i}`}>
                  <TableCell>{r.file}</TableCell>
                  <TableCell>{r.row}</TableCell>
                  <TableCell>{t.rejectReason[r.code] ?? r.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => base.onOpenChange(false)}>
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Popup riêng "Tài khoản đã tồn tại": email/MSSV/mã GV đã có; không vào bảng, không chặn Lưu. */
export function ExistingRowsDialog({
  rows,
  kind,
  ...base
}: BaseProps & { rows: WithFile<ImportExistingRow>[]; kind: AccountKind }) {
  const reasonOf = (field: ImportExistingRow["field"]) =>
    field === "email"
      ? t.existingReason.email
      : kind === "STUDENT"
        ? t.existingReason.studentCode
        : t.existingReason.teacherCode;
  return (
    <Dialog open={base.open} onOpenChange={base.onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="import-existing-popup">
        <DialogHeader>
          <DialogTitle>{t.existingTitle}</DialogTitle>
          <DialogDescription>{t.existingIntro}</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colFile}</TableHead>
                <TableHead>{t.colRow}</TableHead>
                <TableHead>{t.colReason}</TableHead>
                <TableHead>{t.colValue}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.file}-${r.row}-${i}`}>
                  <TableCell>{r.file}</TableCell>
                  <TableCell>{r.row}</TableCell>
                  <TableCell>{reasonOf(r.field)}</TableCell>
                  <TableCell>{r.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => base.onOpenChange(false)}>
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
