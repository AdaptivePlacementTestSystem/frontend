import { useEffect, useState } from "react";

/** Tính giờ còn lại theo đồng hồ SERVER (lệch giờ máy khách không ảnh hưởng): offset = serverTime − giờ máy lúc nhận. */
export function remainingSeconds(
  expiresAt: string,
  serverTime: string,
  receivedAtMs: number,
  nowMs: number,
): number {
  const offset = Date.parse(serverTime) - receivedAtMs;
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - (nowMs + offset)) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useCountdown(
  expiresAt: string | undefined,
  serverTime: string | undefined,
  receivedAtMs: number,
): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt || !serverTime) return null;
  return remainingSeconds(expiresAt, serverTime, receivedAtMs, now);
}
