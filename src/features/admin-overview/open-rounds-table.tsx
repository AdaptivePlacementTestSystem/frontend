import Link from "next/link";
import { EmptyBlock } from "@/components/layout/states";
import { MaterialIcon } from "@/components/ui/material-icon";
import type { OpenRoundRow } from "@/lib/api/types";
import { vi } from "@/messages/vi";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  rounds: OpenRoundRow[];
  /** Hiện "Cập nhật lúc …" cạnh tiêu đề (không tự cập nhật; chỉ làm mới khi tải trang hoặc bấm nút). */
  updatedAt?: string;
}

/** Bảng "Kỳ thi đang mở" (S36, kiểu Stitch): tên, giờ mở — đóng, thời lượng, ba số sinh viên, lối vào quản lý. */
export function OpenRoundsTable({ rounds, updatedAt }: Props) {
  return (
    <div
      data-testid="open-rounds-table"
      className="rounded-xl bg-surface-container-lowest p-8 shadow-sm"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <MaterialIcon name="timer" size={22} />
          </span>
          <h2 className="text-xl leading-7 font-semibold text-on-surface">
            {vi.overview.roundsTitle}
          </h2>
        </div>
        {updatedAt && (
          <span className="text-[13px] text-outline">{vi.overview.roundsUpdatedAt(updatedAt)}</span>
        )}
      </div>
      {rounds.length === 0 ? (
        <EmptyBlock text={vi.overview.roundsEmpty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="bg-surface-container-low text-xs font-semibold tracking-wider text-outline uppercase">
                <th className="rounded-l-lg px-4 py-3">{vi.overview.colRoundName}</th>
                <th className="px-4 py-3">{vi.overview.colRoundWindow}</th>
                <th className="px-4 py-3">{vi.overview.colRoundDuration}</th>
                <th className="px-4 py-3">{vi.overview.colRoundStudents}</th>
                <th className="rounded-r-lg px-4 py-3 text-right">{vi.overview.colRoundAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {rounds.map((round) => (
                <tr
                  key={round.id}
                  data-testid={`open-round-${round.id}`}
                  className="transition-colors hover:bg-surface-container-low/50"
                >
                  <td className="px-4 py-4 font-semibold text-on-surface">{round.name}</td>
                  <td className="px-4 py-4 text-[13px] font-medium text-on-surface">
                    {dateTime.format(new Date(round.opensAt))} —{" "}
                    {dateTime.format(new Date(round.closesAt))}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-1 text-[13px] text-on-surface-variant">
                      <MaterialIcon name="schedule" size={16} />
                      {vi.overview.roundDuration(round.durationMinutes)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[13px] text-on-surface-variant">
                    {vi.overview.roundStudents(round.notStarted, round.inProgress, round.completed)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/admin/exam-rounds/${round.id}`}
                      className="text-[13px] font-semibold text-primary hover:text-primary-container"
                    >
                      {vi.overview.openRound}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
