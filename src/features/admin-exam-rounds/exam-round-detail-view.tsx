"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/api/notify-error";
import {
  closeExamRound,
  getExamRound,
  listExamRounds,
  listParticipants,
  publishExamRound,
  removeParticipant,
  exportParticipants,
} from "./api";

const labels: Record<string, string> = {
  DRAFT: "Bản nháp",
  SCHEDULED: "Đã lên lịch",
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
};
const sessionLabels: Record<string, string> = {
  NOT_STARTED: "Chưa thi",
  IN_PROGRESS: "Đang thi",
  COMPLETED: "Hoàn thành",
  ABANDONED: "Bỏ thi",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );

export function ExamRoundDetailView({ roundId }: { roundId: string }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<
    "" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED"
  >("");
  const query = useQuery({
    queryKey: ["exam-round", roundId],
    queryFn: ({ signal }) => getExamRound(roundId, signal),
  });
  const rounds = useQuery({
    queryKey: ["exam-rounds"],
    queryFn: ({ signal }) => listExamRounds(signal),
  });
  const participants = useQuery({
    queryKey: ["round-participants", roundId, page, term, status],
    queryFn: ({ signal }) =>
      listParticipants(
        roundId,
        { page, pageSize: 20, q: term || undefined, status: status || undefined },
        signal,
      ),
    enabled: !!query.data,
  });
  const action = useMutation({
    mutationFn: (kind: "publish" | "close") =>
      kind === "publish" ? publishExamRound(roundId) : closeExamRound(roundId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["exam-round", roundId] }),
        client.invalidateQueries({ queryKey: ["exam-rounds"] }),
        client.invalidateQueries({ queryKey: ["overview"] }),
      ]);
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => removeParticipant(roundId, studentId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["round-participants", roundId] }),
        client.invalidateQueries({ queryKey: ["exam-rounds"] }),
      ]);
    },
    onError: notifyError,
  });
  const download = async (format: "csv" | "xlsx") => {
    try {
      const { blob, filename } = await exportParticipants(roundId, format, {
        q: term || undefined,
        status: status || undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notifyError(error);
    }
  };
  if (query.isPending) return <LoadingBlock />;
  if (query.isError) return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  const round = query.data;
  const count = rounds.data?.find((item) => item.id === roundId)?.participantCount;
  const changeState = (kind: "publish" | "close") => {
    const message =
      kind === "publish"
        ? "Công bố kỳ thi này?"
        : round.effectiveStatus === "DRAFT"
          ? "Hủy kỳ thi nháp này?"
          : "Đóng kỳ thi? Phiên đang làm vẫn tiếp tục đến hạn đã cấp.";
    if (window.confirm(message)) action.mutate(kind);
  };
  return (
    <div className="space-y-6">
      <Link href="/admin/exam-rounds" className="text-primary hover:underline">
        ← Danh sách kỳ thi
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{round.title}</h1>
        <div className="flex flex-wrap gap-2">
          {round.effectiveStatus !== "CLOSED" && (
            <Link
              className="rounded-md border px-4 py-2"
              href={`/admin/exam-rounds/${roundId}/edit`}
            >
              Sửa kỳ thi
            </Link>
          )}
          {(round.effectiveStatus === "DRAFT" || round.effectiveStatus === "SCHEDULED") && (
            <Link
              className="rounded-md border px-4 py-2"
              href={`/admin/exam-rounds/${roundId}/import`}
            >
              Nhập danh sách thi
            </Link>
          )}
          {round.effectiveStatus === "DRAFT" && (
            <Button
              disabled={action.isPending || count === undefined || count < 1}
              onClick={() => changeState("publish")}
            >
              Công bố
            </Button>
          )}
          {(round.effectiveStatus === "DRAFT" || round.effectiveStatus === "OPEN") && (
            <Button
              variant="outline"
              disabled={action.isPending}
              onClick={() => changeState("close")}
            >
              {round.effectiveStatus === "DRAFT" ? "Hủy kỳ" : "Đóng kỳ"}
            </Button>
          )}
        </div>
      </div>
      {round.effectiveStatus === "DRAFT" && count === 0 && (
        <p>Hãy thêm ít nhất một thí sinh trước khi công bố.</p>
      )}
      {round.effectiveStatus === "DRAFT" && rounds.isError && (
        <p role="alert">
          Không tải được số thí sinh.{" "}
          <button className="underline" onClick={() => rounds.refetch()}>
            Thử lại
          </button>
        </p>
      )}
      <dl className="grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
        <div>
          <dt>Trạng thái</dt>
          <dd className="font-semibold">
            {labels[round.effectiveStatus] ?? round.effectiveStatus}
          </dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd className="font-semibold">{round.durationMinutes} phút</dd>
        </div>
        <div>
          <dt>Thời gian mở</dt>
          <dd className="font-semibold">{date(round.opensAt)}</dd>
        </div>
        <div>
          <dt>Thời gian đóng</dt>
          <dd className="font-semibold">{date(round.closesAt)}</dd>
        </div>
      </dl>
      {
        <section className="space-y-4" aria-label="Theo dõi thí sinh">
          <h2 className="text-xl font-semibold">Theo dõi thí sinh</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void download("csv")}>
              Xuất CSV
            </Button>
            <Button variant="outline" onClick={() => void download("xlsx")}>
              Xuất Excel
            </Button>
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setTerm(search.trim());
            }}
          >
            <input
              aria-label="Tìm MSSV hoặc họ tên"
              className="rounded-md border px-3 py-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" variant="outline">
              Tìm
            </Button>
            <select
              aria-label="Trạng thái dự thi"
              className="rounded-md border px-3 py-2"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as typeof status);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(sessionLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </form>
          {participants.isPending ? (
            <LoadingBlock />
          ) : participants.isError ? (
            <ErrorBlock error={participants.error} onRetry={() => participants.refetch()} />
          ) : (
            <>
              <p>
                Chưa thi: {participants.data.summary.notStarted} · Đang thi:{" "}
                {participants.data.summary.inProgress} · Hoàn thành:{" "}
                {participants.data.summary.completed} · Bỏ thi:{" "}
                {participants.data.summary.abandoned}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>Họ tên</th>
                      <th>Trạng thái</th>
                      <th>Bắt đầu</th>
                      <th>Hoàn thành</th>
                      <th>CEFR</th>
                      {round.effectiveStatus !== "CLOSED" && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.data.data.map((row) => (
                      <tr key={row.studentId} className="border-t">
                        <td className="py-2">{row.studentCode ?? "—"}</td>
                        <td>{row.fullName}</td>
                        <td>
                          {sessionLabels[row.status] ?? row.status}
                          {row.overdue ? " (quá hạn, chờ xử lý)" : ""}
                        </td>
                        <td>{row.startedAt ? date(row.startedAt) : "—"}</td>
                        <td>{row.completedAt ? date(row.completedAt) : "—"}</td>
                        <td>{row.cefrLevel ?? "—"}</td>
                        {round.effectiveStatus !== "CLOSED" && (
                          <td>
                            <Button
                              variant="outline"
                              disabled={remove.isPending || row.status !== "NOT_STARTED"}
                              onClick={() => {
                                if (window.confirm(`Gỡ ${row.fullName} khỏi kỳ thi?`))
                                  remove.mutate(row.studentId);
                              }}
                            >
                              Gỡ
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {participants.data.data.length === 0 && <p>Không có thí sinh phù hợp.</p>}
              <div className="flex items-center gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Trước
                </Button>
                <span>
                  Trang {page} · {participants.data.total} thí sinh
                </span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= participants.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </Button>
              </div>
            </>
          )}
        </section>
      }
    </div>
  );
}
