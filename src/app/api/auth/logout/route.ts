import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/** Đăng xuất: xóa cookie token. (Thu hồi refresh token ở backend: chờ BE-X3.) */
export function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}
