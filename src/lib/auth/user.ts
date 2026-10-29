import type { CurrentUser } from "@/lib/api/types";
import { USER_ROLES, type UserRoleValue as UserRole } from "@apt/shared-types";

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === "string" && x ? x : null);

/**
 * Chuẩn hóa người dùng từ backend. `/auth/me` hiện trả payload JWT `{sub, email, role}`
 * (chưa có fullName/studentCode — BE-X14), `/auth/login` trả `{id, email, fullName, role, mustChangePassword}`.
 * Chấp nhận cả hai; thiếu fullName thì dùng email để giao diện không trống.
 */
export function toCurrentUser(raw: unknown): CurrentUser | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id) ?? str(raw.sub);
  const email = str(raw.email);
  const role = raw.role;
  if (!id || !email || !USER_ROLES.includes(role as UserRole)) return null;
  return {
    id,
    email,
    fullName: str(raw.fullName) ?? email,
    role: role as UserRole,
    studentCode: str(raw.studentCode),
  };
}
