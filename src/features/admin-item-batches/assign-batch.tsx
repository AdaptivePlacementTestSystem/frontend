"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, Search, Send, Users } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

type Teacher = { id: string; fullName: string; role: string; isActive: boolean };
type Item = { id: string; content: string; status: string };
type Row = { itemId: string; reviewerId: string; confirmerId: string };
export function AssignBatch({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [confirmers, setConfirmers] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [firstDueAt, setFirst] = useState("");
  const [secondDueAt, setSecond] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState<{ name?: string | null; cefrTarget?: string | null } | null>(
    null,
  );
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      try {
        const [firstBatch, firstTeachers] = await Promise.all([
          apiRequest<{
            batch: { status: string; name?: string | null; cefrTarget?: string | null };
            items: Item[];
            total: number;
          }>(`/item-batches/${batchId}`, { query: { page: 1, limit: 100 }, signal: abort.signal }),
          apiRequest<{ items: Teacher[]; total: number }>("/teachers", {
            query: { page: 1, pageSize: 100 },
            signal: abort.signal,
          }),
        ]);
        if (firstBatch.batch.status !== "READY_TO_ASSIGN")
          throw new Error("Lô chưa sẵn sàng giao việc.");
        setBatch(firstBatch.batch);
        const batchPages = await Promise.all(
          Array.from({ length: Math.max(0, Math.ceil(firstBatch.total / 100) - 1) }, (_, i) =>
            apiRequest<{ items: Item[] }>(`/item-batches/${batchId}`, {
              query: { page: i + 2, limit: 100 },
              signal: abort.signal,
            }),
          ),
        );
        const teacherPages = await Promise.all(
          Array.from({ length: Math.max(0, Math.ceil(firstTeachers.total / 100) - 1) }, (_, i) =>
            apiRequest<{ items: Teacher[] }>("/teachers", {
              query: { page: i + 2, pageSize: 100 },
              signal: abort.signal,
            }),
          ),
        );
        setItems(
          [firstBatch, ...batchPages].flatMap((p) => p.items).filter((i) => i.status === "DRAFT"),
        );
        setTeachers(
          [firstTeachers, ...teacherPages]
            .flatMap((p) => p.items)
            .filter((t) => t.isActive && t.role === "TEACHER"),
        );
      } catch (e) {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => abort.abort();
  }, [batchId]);
  function toggle(id: string, group: "A" | "B") {
    const update = (list: string[]) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    if (group === "A") {
      setReviewers(update);
      setConfirmers((list) => list.filter((x) => x !== id));
    } else {
      setConfirmers((list) => (list.includes(id) ? [] : [id]));
      setReviewers((list) => list.filter((x) => x !== id));
    }
    setRows([]);
  }
  function preview() {
    if (!reviewers.length || !confirmers.length || !items.length) {
      setError("Chọn ít nhất một giảng viên cho mỗi nhóm và có câu chờ duyệt.");
      return;
    }
    setError("");
    setRows(
      items.map((item, i) => ({
        itemId: item.id,
        reviewerId: reviewers[i % reviewers.length]!,
        confirmerId: confirmers[0]!,
      })),
    );
  }
  async function submit() {
    if (!firstDueAt || !secondDueAt) {
      setError("Chọn ngày giờ cho cả hai vòng.");
      return;
    }
    if (
      new Date(firstDueAt).getTime() <= Date.now() ||
      new Date(secondDueAt).getTime() <= new Date(firstDueAt).getTime()
    ) {
      setError("Hạn vòng A phải ở tương lai và hạn vòng B phải sau vòng A.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/item-batches/${batchId}/assign`, {
        method: "POST",
        body: {
          reviewerIds: reviewers,
          confirmerIds: confirmers,
          firstDueAt: new Date(firstDueAt).toISOString(),
          secondDueAt: new Date(secondDueAt).toISOString(),
          assignments: rows,
        },
      });
      router.push(`/admin/item-batches/${batchId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể giao việc");
    } finally {
      setBusy(false);
    }
  }
  const visibleTeachers = teachers.filter((t) =>
    t.fullName.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
  );
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.fullName ?? id;
  const card = "rounded-xl bg-white p-5 shadow-sm sm:p-6";
  return (
    <main className="mx-auto max-w-[1120px] space-y-6 pb-8 text-slate-900">
      <Link
        href={`/admin/item-batches/${batchId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
      >
        <ArrowLeft size={18} /> Quay lại chi tiết lô
      </Link>
      <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Giao việc thẩm định lô câu hỏi
            </h1>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              CHỜ GIAO VIỆC
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Lô: <strong className="text-slate-900">{batch?.name || "Lô câu hỏi"}</strong>{" "}
            <span className="mx-2 text-slate-400">•</span> Mã lô:{" "}
            <code className="rounded bg-blue-50 px-2 py-1 text-blue-700">{batchId}</code>
          </p>
        </div>
        <div className="flex gap-5 rounded-lg bg-blue-50 px-5 py-3 text-center">
          <div>
            <span className="block text-xs uppercase text-slate-500">Câu chờ giao</span>
            <strong className="text-lg text-blue-700">{items.length}</strong>
          </div>
          {batch?.cefrTarget && (
            <div className="border-l border-blue-200 pl-5">
              <span className="block text-xs uppercase text-slate-500">Khung CEFR</span>
              <strong className="text-lg text-blue-700">{batch.cefrTarget}</strong>
            </div>
          )}
        </div>
      </section>
      <div className="border-b-2 border-blue-100">
        <span className="inline-flex items-center gap-2 border-b-2 border-blue-700 px-4 py-3 text-sm font-semibold text-blue-700">
          <ClipboardList size={19} /> Giao việc mới
        </span>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className={card}>
          Đang tải thông tin lô và giảng viên...
        </p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <section className={`${card} space-y-4 lg:col-span-7`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <span className="rounded-md bg-blue-600 px-2 py-0.5 text-sm text-white">1</span>{" "}
                  Giảng viên duyệt sơ bộ (Vai A)
                </h2>
                <span className="rounded-md bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  Đã chọn {reviewers.length} giảng viên
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  aria-label="Tìm giảng viên theo tên"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên giảng viên..."
                  className="w-full rounded-lg bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {visibleTeachers.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">Không có giảng viên phù hợp.</p>
                ) : (
                  visibleTeachers.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-3 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={reviewers.includes(t.id)}
                        onChange={() => toggle(t.id, "A")}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        <Users size={17} />
                      </span>
                      <span className="text-sm font-medium">{t.fullName}</span>
                    </label>
                  ))
                )}
              </div>
            </section>
            <div className="space-y-6 lg:col-span-5">
              <section className={`${card} space-y-4`}>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <span className="rounded-md bg-violet-600 px-2 py-0.5 text-sm text-white">2</span>{" "}
                  Giảng viên xác nhận (Vai B)
                </h2>
                <p className="text-sm text-slate-500">
                  Chọn một giảng viên B cho cả lô, khác với nhóm A.
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {visibleTeachers.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-3 hover:bg-violet-50"
                    >
                      <input
                        type="radio"
                        name="confirmer"
                        checked={confirmers.includes(t.id)}
                        onChange={() => toggle(t.id, "B")}
                        className="h-4 w-4 accent-violet-600"
                      />
                      <span className="text-sm font-medium">{t.fullName}</span>
                    </label>
                  ))}
                </div>
              </section>
              <section className={`${card} space-y-4`}>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <span className="rounded-md bg-teal-700 px-2 py-0.5 text-sm text-white">3</span>{" "}
                  Cấu hình thời hạn thẩm định
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Hạn vòng A", value: firstDueAt, set: setFirst },
                    { label: "Hạn vòng B", value: secondDueAt, set: setSecond },
                  ].map(({ label, value, set }) => (
                    <label
                      key={label}
                      className="space-y-2 rounded-lg bg-blue-50 p-3 text-sm font-medium text-slate-700"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        {label}
                      </span>
                      <input
                        type="datetime-local"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <section className={`${card} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Xem trước phân bổ công việc</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chia đều câu hỏi theo vòng tròn; có thể điều chỉnh từng câu trước khi xác nhận.
                </p>
              </div>
              <button
                type="button"
                onClick={preview}
                className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Xem trước phân công
              </button>
            </div>
            {rows.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-blue-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Câu hỏi</th>
                      <th className="p-3">Giảng viên A</th>
                      <th className="p-3">Giảng viên B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <tr key={row.itemId}>
                        <td className="p-3">{items[index]?.content}</td>
                        {(["reviewerId", "confirmerId"] as const).map((key, k) => (
                          <td key={key} className="p-3">
                            <select
                              aria-label={`${k ? "Giảng viên B" : "Giảng viên A"} cho câu ${index + 1}`}
                              value={row[key]}
                              onChange={(e) =>
                                setRows((old) =>
                                  old.map((r) =>
                                    r.itemId === row.itemId ? { ...r, [key]: e.target.value } : r,
                                  ),
                                )
                              }
                              className="max-w-52 rounded border border-slate-200 bg-white p-2"
                            >
                              {(k ? confirmers : reviewers).map((id) => (
                                <option key={id} value={id}>
                                  {teacherName(id)}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Chọn giảng viên ở hai vai trò rồi xem trước phân công.
              </p>
            )}
          </section>
          <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
            <div>
              <p className="font-semibold">
                {rows.length
                  ? `Sẵn sàng giao ${rows.length} câu hỏi`
                  : "Chưa có phân công để xác nhận"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Sau khi giao, lô chuyển sang trạng thái đang duyệt.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/admin/item-batches/${batchId}`}
                className="rounded-lg bg-slate-100 px-5 py-3 text-sm font-medium hover:bg-slate-200"
              >
                Hủy bỏ
              </Link>
              <button
                disabled={busy || !rows.length}
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={17} />
                {busy ? "Đang giao..." : "Xác nhận giao việc"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
