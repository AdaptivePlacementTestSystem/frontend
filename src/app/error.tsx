"use client";

import { Button } from "@/components/ui/button";
import { vi } from "@/messages/vi";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center"
      role="alert"
      data-testid="error-page"
    >
      <h1 className="text-2xl font-semibold">{vi.errorPages.errorTitle}</h1>
      <p className="text-muted-foreground">{vi.errorPages.errorBody}</p>
      <Button onClick={reset}>{vi.common.retry}</Button>
    </main>
  );
}
