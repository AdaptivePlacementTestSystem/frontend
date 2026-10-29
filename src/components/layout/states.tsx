import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { vi } from "@/messages/vi";
import { errorMessage } from "@/lib/api/error-message";

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label={vi.common.loading} data-testid="loading" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert variant="destructive" data-testid="error-state">
      <AlertTitle>{vi.common.unexpectedError}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{errorMessage(error)}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {vi.common.retry}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyBlock({ text }: { text: string }) {
  return (
    <p
      data-testid="empty-state"
      className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      {text}
    </p>
  );
}
