export interface JwtClaims {
  sub?: string;
  role?: string;
  exp?: number;
  email?: string;
}

/** Giải mã (KHÔNG xác minh chữ ký) phần payload của JWT để proxy.ts định tuyến theo vai trò. Backend mới là nơi xác minh. */
export function decodeJwtClaims(token: string | undefined | null): JwtClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
    const claims = JSON.parse(json) as unknown;
    return claims && typeof claims === "object" ? (claims as JwtClaims) : null;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims | null, nowMs: number = Date.now()): boolean {
  if (!claims) return true;
  if (typeof claims.exp !== "number") return false;
  return claims.exp * 1000 <= nowMs;
}
