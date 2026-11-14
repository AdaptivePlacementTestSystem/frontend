"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  changeAccountRole,
  createAccount,
  listAccounts,
  lockAccount,
  resendTemporaryPassword,
  unlockAccount,
  updateAccount,
} from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/error-message";
import type {
  AccountKind,
  AdminAccount,
  CreateAccountBody,
  UpdateAccountBody,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { vi } from "@/messages/vi";
import { AccountFormDialog } from "./account-form-dialog";

const t = vi.accounts;
const PAGE_SIZE = 20;

type ConfirmAction = "lock" | "resend" | "grant" | "revoke";
interface Pending {
  action: ConfirmAction;
  account: AdminAccount;
}

const CONFIRM_TEXT: Record<ConfirmAction, { title: string; body: string; destructive: boolean }> = {
  lock: { title: t.confirmLockTitle, body: t.confirmLockBody, destructive: true },
  resend: { title: t.confirmResendTitle, body: t.confirmResendBody, destructive: false },
  grant: { title: t.confirmGrantTitle, body: t.confirmGrantBody, destructive: false },
  revoke: { title: t.confirmRevokeTitle, body: t.confirmRevokeBody, destructive: true },
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

interface Props {
  kind: AccountKind;
  /** Id Admin đang đăng nhập: không cho tự khóa mình hay tự thu hồi quyền (BR-17/19). */
  currentUserId: string;
}

/**
 * Quản lý tài khoản SV/GV (S24, F-22). Hai tab là hai route dùng chung một thành phần; Admin nằm trong tab Giảng
 * viên để thu hồi quyền. Quy tắc nút: không tự khóa/tự thu hồi, không khóa Admin, không gửi lại mật khẩu cho Admin.
 */
export function AccountsView({ kind, currentUserId }: Props) {
  const queryClient = useQueryClient();
  const isStudent = kind === "STUDENT";
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ["accounts", kind, q, page],
    queryFn: ({ signal }) =>
      listAccounts(kind, { q: q || undefined, page, pageSize: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });

  const handleCreate = async (body: CreateAccountBody) => {
    await createAccount(kind, body);
    toast.success(t.created);
    await refresh();
  };
  const handleUpdate = async (id: string, body: UpdateAccountBody) => {
    await updateAccount(kind, id, body);
    toast.success(t.updated);
    await refresh();
  };

  const runConfirmed = async () => {
    if (!pending) return;
    const { action, account } = pending;
    setBusy(true);
    try {
      if (action === "lock") await lockAccount(account.id);
      else if (action === "resend") await resendTemporaryPassword(account.id);
      else if (action === "grant") await changeAccountRole(account.id, "ADMIN");
      else await changeAccountRole(account.id, "TEACHER");
      toast.success(
        { lock: t.locked, resend: t.resent, grant: t.roleGranted, revoke: t.roleRevoked }[action],
      );
      setPending(null);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const unlock = async (account: AdminAccount) => {
    try {
      await unlockAccount(account.id);
      toast.success(t.unlocked);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const data = query.data;
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-4" data-testid="accounts-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <div className="flex gap-2">
          <Button
            data-testid={isStudent ? "add-student" : "add-teacher"}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {isStudent ? t.addStudent : t.addTeacher}
          </Button>
          <Button variant="outline" asChild data-testid="import-accounts">
            <Link href={`/admin/users/import?kind=${kind}`}>{t.importAccounts}</Link>
          </Button>
        </div>
      </div>

      <nav aria-label={t.title} className="flex gap-1 border-b">
        {(
          [
            {
              href: "/admin/users/students",
              label: t.tabStudents,
              id: "students",
              active: isStudent,
            },
            {
              href: "/admin/users/teachers",
              label: t.tabTeachers,
              id: "teachers",
              active: !isStudent,
            },
          ] as const
        ).map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            data-testid={`accounts-tab-${tab.id}`}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={isStudent ? t.searchStudents : t.searchTeachers}
        aria-label={isStudent ? t.searchStudents : t.searchTeachers}
        data-testid="account-search"
        className="max-w-md"
      />

      {query.isPending ? (
        <LoadingBlock rows={5} />
      ) : query.isError ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyBlock text={q ? t.emptySearch : isStudent ? t.emptyStudents : t.emptyTeachers} />
      ) : (
        <>
          <Table data-testid="accounts-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t.colName}</TableHead>
                <TableHead>{isStudent ? t.colStudentCode : t.colTeacherCode}</TableHead>
                <TableHead>{t.colEmail}</TableHead>
                <TableHead>{t.colStatus}</TableHead>
                <TableHead>{t.colChangedPassword}</TableHead>
                <TableHead className="text-right">{t.colActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((account) => {
                const isSelf = account.id === currentUserId;
                const isAdmin = account.role === "ADMIN";
                return (
                  <TableRow key={account.id} data-testid={`account-row-${account.id}`}>
                    <TableCell className="font-medium">
                      {account.fullName}
                      {isAdmin && (
                        <Badge variant="secondary" className="ml-2">
                          {t.roleAdmin}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(isStudent ? account.studentCode : account.teacherCode) || "—"}
                    </TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "outline" : "destructive"}>
                        {account.isActive ? t.statusActive : t.statusLocked}
                      </Badge>
                    </TableCell>
                    <TableCell>{account.mustChangePassword ? t.changedNo : t.changedYes}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`edit-${account.id}`}
                          onClick={() => {
                            setEditing(account);
                            setFormOpen(true);
                          }}
                        >
                          {t.edit}
                        </Button>
                        {account.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`lock-${account.id}`}
                            disabled={isSelf || isAdmin}
                            title={isSelf ? t.selfTitle : isAdmin ? t.adminLockTitle : undefined}
                            onClick={() => setPending({ action: "lock", account })}
                          >
                            {t.lock}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`lock-${account.id}`}
                            onClick={() => unlock(account)}
                          >
                            {t.unlock}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`resend-temp-${account.id}`}
                          disabled={isAdmin}
                          title={isAdmin ? t.adminResendTitle : undefined}
                          onClick={() => setPending({ action: "resend", account })}
                        >
                          {t.resend}
                        </Button>
                        {!isStudent && (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`grant-admin-${account.id}`}
                            disabled={isAdmin && isSelf}
                            title={isAdmin && isSelf ? t.selfTitle : undefined}
                            onClick={() =>
                              setPending({ action: isAdmin ? "revoke" : "grant", account })
                            }
                          >
                            {isAdmin ? t.revokeAdmin : t.grantAdmin}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span data-testid="accounts-page-info">{t.pageInfo(from, to, total)}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                data-testid="accounts-prev"
              >
                {t.prev}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                data-testid="accounts-next"
              >
                {t.next}
              </Button>
            </div>
          </div>
        </>
      )}

      <AccountFormDialog
        kind={kind}
        account={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !busy && setPending(null)}
        title={pending ? CONFIRM_TEXT[pending.action].title : ""}
        description={
          pending ? `${pending.account.fullName}. ${CONFIRM_TEXT[pending.action].body}` : undefined
        }
        destructive={pending ? CONFIRM_TEXT[pending.action].destructive : false}
        busy={busy}
        onConfirm={runConfirmed}
      />
    </div>
  );
}
