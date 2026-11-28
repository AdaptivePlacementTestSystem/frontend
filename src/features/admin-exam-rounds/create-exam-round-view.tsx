"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createExamRound } from "./api";
import { MaterialIcon } from "@/components/ui/material-icon";

const inputClass =
  "h-12 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary";
const cardClass = "space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm";

export function CreateExamRoundView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createExamRound,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exam-rounds"] });
      toast.success("Đã tạo bản nháp kỳ thi.");
      router.push("/admin/exam-rounds");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Không thể tạo kỳ thi."),
  });
  const [name, setName] = useState("");
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [duration, setDuration] = useState("45");
  const invalidWindow =
    !!opens && !!closes && new Date(closes).getTime() <= new Date(opens).getTime();
  const minutes = Number(duration);
  const valid =
    !!name.trim() &&
    !!opens &&
    !!closes &&
    !invalidWindow &&
    Number.isInteger(minutes) &&
    minutes >= 5 &&
    minutes <= 180 &&
    minutes * 60000 <= new Date(closes).getTime() - new Date(opens).getTime();
  const formatDate = (value: string) =>
    value
      ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
          new Date(value),
        )
      : "Chưa thiết lập";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/admin/exam-rounds"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary"
          >
            <MaterialIcon name="calendar_month" size={17} /> Quản trị kỳ thi / Tạo kỳ thi mới
          </Link>
          <Link
            href="/admin/exam-rounds"
            className="flex items-center gap-1 rounded-lg bg-surface-container px-3 py-2 text-on-surface-variant"
          >
            <MaterialIcon name="arrow_back" size={18} /> Quay lại danh sách kỳ thi
          </Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight">Tạo kỳ thi khảo thí mới</h1>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-primary shadow-sm">
            1. Cấu hình kỳ thi <span className="mx-2 text-outline">→</span>
            <span className="text-outline">2. Thêm thí sinh</span>
            <span className="mx-2 text-outline">→</span>
            <span className="text-outline">3. Công bố</span>
          </div>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-semibold">
              <MaterialIcon name="assignment" className="text-primary" /> 1. Thông tin cơ bản
            </h2>
            <div className="space-y-2">
              <label htmlFor="round-name" className="text-sm font-semibold">
                Tên kỳ thi <span className="text-red-700">*</span>
              </label>
              <input
                id="round-name"
                data-testid="round-name"
                className={inputClass}
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Kỳ thi Xếp lớp Anh văn Đầu khóa K2026"
              />
              <p className="text-xs text-outline">Gợi ý: mục đích, đối tượng, năm và đợt thi.</p>
            </div>
          </section>
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-semibold">
              <MaterialIcon name="schedule" className="text-primary" /> 2. Khung thời gian &amp;
              thời lượng làm bài
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="round-opens" className="text-sm font-semibold">
                  Thời gian mở <span className="text-red-700">*</span>
                </label>
                <input
                  id="round-opens"
                  data-testid="round-opens"
                  className={inputClass}
                  type="datetime-local"
                  value={opens}
                  onChange={(e) => setOpens(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="round-closes" className="text-sm font-semibold">
                  Thời gian đóng <span className="text-red-700">*</span>
                </label>
                <input
                  id="round-closes"
                  data-testid="round-closes"
                  className={inputClass}
                  type="datetime-local"
                  value={closes}
                  onChange={(e) => setCloses(e.target.value)}
                  aria-invalid={invalidWindow}
                />
                {invalidWindow && (
                  <p role="alert" className="text-xs text-red-700">
                    Thời gian đóng phải sau thời gian mở.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <label htmlFor="round-duration" className="text-sm font-semibold">
                Thời lượng bài thi cá nhân (phút) <span className="text-red-700">*</span>
              </label>
              <p className="mt-1 text-xs text-outline">Từ 5 đến 180 phút; mặc định 45 phút.</p>
              <input
                id="round-duration"
                data-testid="round-duration"
                className={`${inputClass} mt-3 max-w-36`}
                type="number"
                min="5"
                max="180"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <p className="mt-2 text-xs text-on-surface-variant">
                Hạn phiên được tính lúc bắt đầu theo thời lượng cá nhân và thời gian đóng kỳ khi đó.
                Đóng kỳ thủ công không rút ngắn hạn đã cấp.
              </p>
            </div>
          </section>
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-semibold">
              <MaterialIcon name="psychology" className="text-primary" /> 3. Ngân hàng câu hỏi &amp;
              CAT-Rasch
            </h2>
            <p className="text-sm text-on-surface-variant">
              Bài thi sử dụng các câu hỏi đã được duyệt cuối cùng trong ngân hàng câu hỏi.
            </p>
          </section>
        </div>
        <aside className="space-y-6 lg:col-span-4">
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 font-semibold text-primary">
              <MaterialIcon name="info" /> Vòng đời kỳ thi
            </h2>
            <div className="space-y-4 text-sm text-on-surface-variant">
              <p>
                <strong className="text-on-surface">1. Bản nháp:</strong> kỳ thi mới ở trạng thái
                DRAFT và có thể chỉnh sửa trước khi công bố.
              </p>
              <p>
                <strong className="text-on-surface">2. Thêm thí sinh &amp; công bố:</strong> kỳ thi
                cần ít nhất một thí sinh trước khi công bố.
              </p>
              <p>
                <strong className="text-on-surface">3. Đóng kỳ thi:</strong> kỳ thi CLOSED không
                được chỉnh sửa. Khi đang mở, chỉ có thể kéo dài thời gian đóng.
              </p>
            </div>
          </section>
          <section className={cardClass}>
            <h2 className="border-b border-slate-200 pb-3 text-xs font-semibold uppercase tracking-wide text-outline">
              Xem trước thông tin kỳ thi
            </h2>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-surface-container-low p-4">
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                Bản nháp
              </span>
              <h3 className="font-semibold">{name || "Tên kỳ thi"}</h3>
              <p className="text-sm text-on-surface-variant">Mở: {formatDate(opens)}</p>
              <p className="text-sm text-on-surface-variant">Đóng: {formatDate(closes)}</p>
              <p className="text-sm text-on-surface-variant">
                Thời lượng cá nhân: {duration || "—"} phút
              </p>
            </div>
          </section>
        </aside>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg lg:col-span-12">
          <p className="text-sm text-on-surface-variant">
            Điền đầy đủ thông tin; thời lượng không vượt quá khung thời gian kỳ thi.
          </p>
          <div className="flex gap-3">
            <Link
              href="/admin/exam-rounds"
              className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium"
            >
              Hủy bỏ
            </Link>
            <button
              type="button"
              data-testid="save-round"
              disabled={!valid || mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  name: name.trim(),
                  opensAt: new Date(opens).toISOString(),
                  closesAt: new Date(closes).toISOString(),
                  durationMinutes: minutes,
                })
              }
              className="rounded-lg bg-primary-container px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lưu bản nháp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
