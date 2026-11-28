"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/api/notify-error";
import { getExamRound, updateExamRound } from "./api";

type Detail = Awaited<ReturnType<typeof getExamRound>>;
function localInput(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditForm({ round, roundId }: { round: Detail; roundId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [name, setName] = useState(round.title);
  const [opensAt, setOpensAt] = useState(localInput(round.opensAt));
  const [closesAt, setClosesAt] = useState(localInput(round.closesAt));
  const [duration, setDuration] = useState(String(round.durationMinutes));
  const [error, setError] = useState("");
  const action = useMutation({
    mutationFn: (body: Parameters<typeof updateExamRound>[1]) => updateExamRound(roundId, body),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["exam-round", roundId] }),
        client.invalidateQueries({ queryKey: ["exam-rounds"] }),
        client.invalidateQueries({ queryKey: ["overview"] }),
      ]);
      router.push(`/admin/exam-rounds/${roundId}`);
    },
    onError: notifyError,
  });
  const status = round.effectiveStatus;
  if (status === "CLOSED") return <p>Kỳ thi đã đóng, không thể sửa.</p>;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const startChanged = opensAt !== localInput(round.opensAt);
    const endChanged = closesAt !== localInput(round.closesAt);
    const start = new Date(startChanged ? opensAt : round.opensAt),
      end = new Date(endChanged ? closesAt : round.closesAt),
      minutes = Number(duration);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start ||
      !Number.isInteger(minutes) ||
      minutes < 5 ||
      minutes > 180 ||
      end.getTime() - start.getTime() < minutes * 60000
    ) {
      setError("Kiểm tra thời gian mở, đóng và thời lượng từ 5 đến 180 phút.");
      return;
    }
    if (status === "DRAFT" && !name.trim()) {
      setError("Tên kỳ thi không được để trống.");
      return;
    }
    if (status === "OPEN" && end.getTime() <= new Date(round.closesAt).getTime()) {
      setError("Kỳ đang mở chỉ được kéo dài thời gian đóng.");
      return;
    }
    const body = {
      ...(status === "DRAFT" && name.trim() !== round.title ? { name: name.trim() } : {}),
      ...(status !== "OPEN" && startChanged ? { opensAt: start.toISOString() } : {}),
      ...(endChanged ? { closesAt: end.toISOString() } : {}),
      ...(status === "DRAFT" && minutes !== round.durationMinutes
        ? { durationMinutes: minutes }
        : {}),
    };
    if (!Object.keys(body).length) {
      setError("Không có thay đổi để lưu.");
      return;
    }
    action.mutate(body);
  };
  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Sửa kỳ thi</h1>
      {status === "OPEN" && (
        <p>Phiên đang làm giữ nguyên hạn đã cấp; chỉ có thể kéo dài thời gian đóng.</p>
      )}
      {status === "SCHEDULED" && (
        <p>Giờ mở mới phải ở tương lai. Tên và thời lượng không thể sửa sau công bố.</p>
      )}
      {status === "DRAFT" && (
        <label className="block">
          Tên kỳ thi
          <input
            className="mt-1 w-full rounded-md border p-2"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}
      {status !== "OPEN" && (
        <label className="block">
          Thời gian mở
          <input
            className="mt-1 w-full rounded-md border p-2"
            type="datetime-local"
            required
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
          />
        </label>
      )}
      <label className="block">
        Thời gian đóng
        <input
          className="mt-1 w-full rounded-md border p-2"
          type="datetime-local"
          required
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
        />
      </label>
      {status === "DRAFT" && (
        <label className="block">
          Thời lượng (phút)
          <input
            className="mt-1 w-full rounded-md border p-2"
            type="number"
            min={5}
            max={180}
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={action.isPending}>
          {action.isPending ? "Đang lưu..." : "Lưu"}
        </Button>
        <Link href={`/admin/exam-rounds/${roundId}`} className="rounded-md border px-4 py-2">
          Hủy
        </Link>
      </div>
    </form>
  );
}

export function EditExamRoundView({ roundId }: { roundId: string }) {
  const query = useQuery({
    queryKey: ["exam-round", roundId],
    queryFn: ({ signal }) => getExamRound(roundId, signal),
  });
  if (query.isPending) return <LoadingBlock />;
  if (query.isError) return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  return (
    <EditForm
      key={`${query.data.id}-${query.data.effectiveStatus}`}
      round={query.data}
      roundId={roundId}
    />
  );
}
