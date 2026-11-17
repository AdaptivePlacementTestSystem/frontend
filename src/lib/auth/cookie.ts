import type { NextResponse } from "next/server";
import { decodeJwtClaims } from "./jwt";
import { TOKEN_COOKIE } from "./roles";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60;

/** Đặt token vào cookie httpOnly (trình duyệt không đọc được); hạn cookie theo `exp` của JWT. */
export function setTokenCookie(res: NextResponse, accessToken: string) {
  const exp = decodeJwtClaims(accessToken)?.exp;
  const maxAge = exp ? Math.max(60, Math.floor(exp - Date.now() / 1000)) : DEFAULT_MAX_AGE_SECONDS;
  res.cookies.set(TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}
