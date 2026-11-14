"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { bffRequest } from "@/lib/api/client";
import { vi } from "@/messages/vi";

export function LogoutButton({ variant = "outline" }: { variant?: "outline" | "admin" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await bffRequest("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };
  if (variant === "admin") {
    // Kiểu của Stitch: chữ đỏ nhỏ trong thanh bên Admin
    return (
      <button
        type="button"
        disabled={busy}
        data-testid="logout"
        title={vi.nav.logout}
        onClick={onClick}
        className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[13px] text-error transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-60"
      >
        <MaterialIcon name="logout" size={16} />
        {vi.adminNav.logout}
      </button>
    );
  }
  return (
    <Button variant="outline" size="sm" disabled={busy} data-testid="logout" onClick={onClick}>
      {vi.nav.logout}
    </Button>
  );
}
