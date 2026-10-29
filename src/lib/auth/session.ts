import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import type { CurrentUser } from "@/lib/api/types";
import { TOKEN_COOKIE, homeFor } from "./roles";
import { toCurrentUser } from "./user";
import { isStaff } from "./roles";

/**
 * Người dùng hiện tại ở phía server (Server Component/layout). Gọi backend `/auth/me` bằng token trong cookie
 * httpOnly; mỗi request chỉ gọi một lần (React `cache`). Không có token/không hợp lệ ⇒ null.
 */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${env.API_BASE_URL}/auth/me`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return toCurrentUser(await res.json());
  } catch {
    return null;
  }
});

type Audience = "student" | "staff";

/** Chặn truy cập theo vai trò ở layout (bổ sung cho proxy.ts; vẫn chỉ là UX, backend kiểm quyền thật). */
export async function requireUser(audience: Audience): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ok = audience === "staff" ? isStaff(user.role) : user.role === "STUDENT";
  if (!ok) redirect(audience === "staff" ? "/403" : homeFor(user.role));
  return user;
}
