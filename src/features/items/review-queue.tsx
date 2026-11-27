"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { listItems } from "@/lib/api/endpoints";
import { vi } from "@/messages/vi";

export function ReviewQueue() {
  // DC-32: duyệt/từ chối nay làm theo gói A/B (S11, S33–S35); màn này chỉ xem. TODO: thay bằng Hộp việc GV.
  const q = useQuery({
    queryKey: ["items", "queue"],
    queryFn: ({ signal }) => listItems({ status: "FIRST_APPROVED", page: 1, limit: 50 }, signal),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{vi.items.queueTitle}</h1>
      {q.isPending ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyBlock text={vi.items.queueEmpty} />
      ) : (
        <ul className="space-y-3" data-testid="queue-list">
          {q.data.data.map((it) => (
            <li key={it.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{it.content}</p>
                    <p className="mt-1 flex gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{vi.skill[it.skill]}</Badge>
                      <span>{it.cefrTarget}</span>
                      <span>
                        {vi.items.b} = {it.irtB.toFixed(1)}
                      </span>
                      <Link className="underline" href={`/teacher/items/${it.id}`}>
                        {vi.items.view}
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
