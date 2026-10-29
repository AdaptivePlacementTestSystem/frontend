"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getNextItem, submitResponse } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import { OPTION_KEYS, type ExamItem, type OptionKey, type SessionMeta } from "@/lib/api/types";
import { vi } from "@/messages/vi";
import { formatClock, useCountdown } from "./use-countdown";

interface QuestionProps {
  sessionId: string;
  item: ExamItem;
  session: SessionMeta;
  receivedAt: number;
  onExpired: () => void;
}

/** Một câu hỏi. Được gắn `key={item.id}` nên mỗi câu mới là một bản mới: lựa chọn và đồng hồ đo thời gian tự reset. */
function Question({ sessionId, item, session, receivedAt, onExpired }: QuestionProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<OptionKey | "">("");
  const [shownAt] = useState(() => Date.now());
  const left = useCountdown(session.expiresAt, session.serverTime, receivedAt);

  // Hết giờ ⇒ hỏi lại server (server mới là nơi đóng phiên, #77)
  const expired = left === 0;
  const fired = useRef(false);
  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true; // chỉ báo một lần cho mỗi câu, tránh vòng lặp tải lại
      onExpired();
    }
  }, [expired, onExpired]);

  const submit = useMutation({
    mutationFn: (v: { itemId: string; response: OptionKey }) =>
      submitResponse(sessionId, { ...v, responseTimeMs: Date.now() - shownAt }),
    onSuccess: async (res) => {
      if (res.shouldStop) {
        router.replace(`/results/${sessionId}`);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["next-item", sessionId] });
    },
    onError: async (e) => {
      if (e instanceof ApiError && e.code === "SESSION_ITEM_MISMATCH") {
        toast.warning(errorMessage(e));
        await qc.invalidateQueries({ queryKey: ["next-item", sessionId] });
      } else if (e instanceof ApiError && e.code === "SESSION_EXPIRED") {
        toast.info(errorMessage(e));
        router.replace("/");
      } else {
        toast.error(errorMessage(e)); // lỗi mạng: giữ nguyên lựa chọn để thử nộp lại
      }
    },
  });

  return (
    <Card data-testid="exam-card">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">
          {vi.exam.question} {session.itemCount + 1} {vi.exam.of} {session.maxItems}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{vi.skill[item.skill]}</Badge>
          {left !== null && (
            <span
              className="font-mono text-sm tabular-nums"
              role="timer"
              aria-label={vi.exam.timeLeft}
              data-testid="countdown"
            >
              {vi.exam.timeLeft} {formatClock(left)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-lg" data-testid="question-content">
          {item.content}
        </p>
        <RadioGroup
          value={choice}
          onValueChange={(v) => setChoice(v as OptionKey)}
          aria-label={item.content}
          className="space-y-2"
        >
          {OPTION_KEYS.map((k) => (
            <div
              key={k}
              className="flex items-center gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem value={k} id={`opt-${k}`} data-testid={`option-${k}`} />
              <Label htmlFor={`opt-${k}`} className="flex-1 cursor-pointer font-normal">
                <span className="mr-2 font-semibold">{k}.</span>
                {item.options[k]}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="flex items-center gap-3">
          <Button
            disabled={!choice || submit.isPending}
            onClick={() => choice && submit.mutate({ itemId: item.id, response: choice })}
            data-testid="submit-answer"
          >
            {submit.isPending ? vi.exam.submitting : vi.exam.submit}
          </Button>
          {!choice && <span className="text-sm text-muted-foreground">{vi.exam.pick}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExamRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const next = useQuery({
    queryKey: ["next-item", sessionId],
    queryFn: ({ signal }) => getNextItem(sessionId, signal),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const { refetch } = next;
  const onExpired = () => {
    toast.info(vi.exam.expired);
    void refetch();
  };

  const finishedId = next.data?.kind === "finished" ? next.data.sessionId : null;
  useEffect(() => {
    if (finishedId) router.replace(`/results/${finishedId}`);
  }, [finishedId, router]);

  const goHome =
    next.isError &&
    next.error instanceof ApiError &&
    (next.error.code === "NOT_FOUND" || next.error.code === "FORBIDDEN");
  useEffect(() => {
    if (goHome) router.replace("/");
  }, [goHome, router]);

  if (next.isPending) return <LoadingBlock rows={4} />;
  if (next.isError) {
    const e = next.error;
    if (e instanceof ApiError && e.code === "NO_ITEMS_AVAILABLE") {
      return (
        <Alert data-testid="no-items">
          <AlertTitle>{vi.errors.NO_ITEMS_AVAILABLE}</AlertTitle>
        </Alert>
      );
    }
    if (goHome) return null;
    return <ErrorBlock error={e} onRetry={() => refetch()} />;
  }
  const current = next.data;
  if (current.kind === "finished") return <p role="status">{vi.exam.finishing}</p>;
  return (
    <Question
      key={current.item.id}
      sessionId={sessionId}
      item={current.item}
      session={current.session}
      receivedAt={next.dataUpdatedAt}
      onExpired={onExpired}
    />
  );
}
