"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { bffRequest } from "@/lib/api/client";
import { vi } from "@/messages/vi";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      data-testid="logout"
      onClick={async () => {
        setBusy(true);
        try {
          await bffRequest("/api/auth/logout", { method: "POST" });
        } finally {
          router.replace("/login");
          router.refresh();
        }
      }}
    >
      {vi.nav.logout}
    </Button>
  );
}
