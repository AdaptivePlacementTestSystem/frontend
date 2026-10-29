"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getReview } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { OPTION_KEYS, type ReviewEntry } from "@/lib/api/types";
import { parseExplanation } from "@/lib/explanation";
import { vi } from "@/messages/vi";

function ExplanationPanel({ entry }: { entry: ReviewEntry }) {
  const exp = parseExplanation(entry.explanation);
  if (!exp) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="no-explanation">
        {vi.review.noExplanation}
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-md bg-muted p-3 text-sm" data-testid="explanation">
      <p className="font-medium">{vi.review.explanation}</p>
      {exp.general && <p>{exp.general}</p>}
      <ul className="space-y-1">
        {OPTION_KEYS.filter((k) => exp.options[k]).map((k) => (
          <li key={k}>
            <span className="font-semibold">{k}.</span> {exp.options[k]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewView({ sessionId }: { sessionId: string }) {
  const q = useQuery({
    queryKey: ["review", sessionId],
    queryFn: ({ signal }) => getReview(sessionId, signal),
    retry: false,
  });
  const back = (
    <Button asChild variant="outline">
      <Link href={`/results/${sessionId}`}>{vi.review.back}</Link>
    </Button>
  );

  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.code === "REVIEW_DISABLED") {
      return (
        <div className="space-y-4">
          <Alert data-testid="review-disabled">
            <AlertTitle>{vi.review.disabledTitle}</AlertTitle>
            <AlertDescription>{vi.review.disabledBody}</AlertDescription>
          </Alert>
          {back}
        </div>
      );
    }
    return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{vi.review.title}</h1>
      {q.data.map((e) => (
        <Card key={e.order} data-testid="review-entry">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              {vi.exam.question} {e.order}
            </CardTitle>
            <Badge variant={e.isCorrect ? "secondary" : "destructive"}>
              {e.isCorrect ? vi.review.correct : vi.review.wrong}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{e.content}</p>
            <ul className="space-y-1 text-sm">
              {OPTION_KEYS.map((k) => (
                <li
                  key={k}
                  className={
                    k === e.correct
                      ? "font-semibold text-green-700 dark:text-green-400"
                      : k === e.chosen
                        ? "text-destructive"
                        : ""
                  }
                >
                  {k}. {e.options[k]}
                  {k === e.chosen && ` ← ${vi.review.yourAnswer}`}
                  {k === e.correct && ` ✓ ${vi.review.correctAnswer}`}
                </li>
              ))}
            </ul>
            <ExplanationPanel entry={e} />
          </CardContent>
        </Card>
      ))}
      {back}
    </div>
  );
}
