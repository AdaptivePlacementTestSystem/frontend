"use client";

import { useCallback, useEffect, useState } from "react";

/** Đếm ngược theo giây (khóa nút gửi lại). */
export function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const start = useCallback((seconds: number) => setLeft(seconds), []);
  return { left, start };
}
