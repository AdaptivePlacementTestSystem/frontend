"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getItem } from "@/lib/api/endpoints";
import { OPTION_KEYS } from "@/lib/api/types";
import { parseExplanation } from "@/lib/explanation";
import { vi } from "@/messages/vi";

export function ItemDetailView({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["item", id],
    queryFn: ({ signal }) => getItem(id, signal),
    retry: false,
  });

  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;

  const it = q.data;
  const exp = parseExplanation(it.explanation);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{vi.items.title}</h1>
        <Badge data-testid="item-status">{vi.itemStatus[it.status]}</Badge>
        <Badge variant="secondary">{vi.itemSource[it.source]}</Badge>
      </div>

      {it.status === "FINAL_APPROVED" && (
        <Alert data-testid="approved-notice">
          <AlertDescription>{vi.items.approvedNotice}</AlertDescription>
        </Alert>
      )}
      {(it.status === "FIRST_APPROVED" || it.status === "SECOND_APPROVED") && (
        <Alert data-testid="pending-notice">
          <AlertDescription>{vi.items.pendingNotice}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{it.content}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-1">
            {OPTION_KEYS.map((k) => (
              <li
                key={k}
                className={
                  k === it.correctAnswer ? "font-semibold text-green-700 dark:text-green-400" : ""
                }
              >
                {k}. {it.options[k]} {k === it.correctAnswer && "✓"}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            {vi.skill[it.skill]} · {it.cefrTarget} · b = {it.irtB.toFixed(1)}
            {it.topicTag ? ` · ${it.topicTag}` : ""}
          </p>
          {exp ? (
            <div className="rounded-md bg-muted p-3" data-testid="explanation">
              {exp.general && <p>{exp.general}</p>}
              <ul className="mt-1 space-y-1">
                {OPTION_KEYS.filter((k) => exp.options[k]).map((k) => (
                  <li key={k}>
                    {k}. {exp.options[k]}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground">{vi.review.noExplanation}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/teacher/items">{vi.items.title}</Link>
        </Button>
      </div>
    </div>
  );
}
