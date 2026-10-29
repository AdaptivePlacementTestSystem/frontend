import Link from "next/link";
import { Button } from "@/components/ui/button";
import { vi } from "@/messages/vi";

export default function NotFound() {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center"
      data-testid="not-found"
    >
      <h1 className="text-2xl font-semibold">{vi.errorPages.notFoundTitle}</h1>
      <p className="text-muted-foreground">{vi.errorPages.notFoundBody}</p>
      <Button asChild>
        <Link href="/">{vi.errorPages.goHome}</Link>
      </Button>
    </main>
  );
}
