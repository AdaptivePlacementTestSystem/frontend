"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getActiveSession, startSession } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import { vi } from "@/messages/vi";

export function StudentHome() {
  const router = useRouter();
  const active = useQuery({
    queryKey: ["active-session"],
    queryFn: ({ signal }) => getActiveSession(signal),
  });

  const start = useMutation({
    mutationFn: startSession,
    onSuccess: ({ sessionId }) => router.push(`/exam/${sessionId}`),
    onError: (e) => {
      // 409: đã có phiên đang làm ⇒ chuyển sang phiên đó thay vì báo lỗi
      if (e instanceof ApiError && e.code === "SESSION_IN_PROGRESS") {
        const id = (e.details as { sessionId?: string } | undefined)?.sessionId;
        if (id) {
          toast.info(vi.errors.SESSION_IN_PROGRESS);
          router.push(`/exam/${id}`);
          return;
        }
      }
      toast.error(errorMessage(e));
    },
  });

  if (active.isPending) return <LoadingBlock />;
  if (active.isError) return <ErrorBlock error={active.error} onRetry={() => active.refetch()} />;

  const session = active.data.session;
  const closed = active.data.closedPrevious;

  return (
    <div className="space-y-4">
      {closed && (
        <Alert data-testid="closed-previous">
          <AlertDescription>
            {closed.status === "ABANDONED" ? vi.home.closedAbandoned : vi.home.closedCompleted}{" "}
            {closed.status === "COMPLETED" && (
              <Link className="underline" href={`/results/${closed.sessionId}`}>
                {vi.exam.viewResult}
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{vi.home.title}</CardTitle>
          <CardDescription>{vi.home.intro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {vi.home.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {session ? (
            <Button asChild data-testid="resume-exam">
              <Link href={`/exam/${session.sessionId}`}>
                {vi.home.resume} ({session.itemCount}/{session.maxItems})
              </Link>
            </Button>
          ) : (
            <Button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              data-testid="start-exam"
            >
              {start.isPending ? vi.home.starting : vi.home.start}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
