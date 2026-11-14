import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyBlock } from "@/components/layout/states";
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

/** Bảng "Kỳ thi đang mở" (S36): tên, giờ mở — đóng, thời lượng, ba số sinh viên, lối vào quản lý. */
export function OpenRoundsTable({ rounds, updatedAt }: Props) {
  return (
    <Card data-testid="open-rounds-table">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">{vi.overview.roundsTitle}</CardTitle>
        {updatedAt && (
          <span className="text-sm text-muted-foreground">
            {vi.overview.roundsUpdatedAt(updatedAt)}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <EmptyBlock text={vi.overview.roundsEmpty} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{vi.overview.colRoundName}</TableHead>
                <TableHead>{vi.overview.colRoundWindow}</TableHead>
                <TableHead>{vi.overview.colRoundDuration}</TableHead>
                <TableHead>{vi.overview.colRoundStudents}</TableHead>
                <TableHead className="text-right">{vi.overview.colRoundAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds.map((round) => (
                <TableRow key={round.id} data-testid={`open-round-${round.id}`}>
                  <TableCell className="font-medium">{round.name}</TableCell>
                  <TableCell>
                    {dateTime.format(new Date(round.opensAt))} —{" "}
                    {dateTime.format(new Date(round.closesAt))}
                  </TableCell>
                  <TableCell>{vi.overview.roundDuration(round.durationMinutes)}</TableCell>
                  <TableCell>
                    {vi.overview.roundStudents(round.notStarted, round.inProgress, round.completed)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/exam-rounds/${round.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {vi.overview.openRound}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
