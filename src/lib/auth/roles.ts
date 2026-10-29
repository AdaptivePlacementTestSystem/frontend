export const TOKEN_COOKIE = "apt_token";

/** Trang đích sau đăng nhập (file mô tả màn hình, Mục 3). */
export function homeFor(role: string | undefined | null): string {
  if (role === "TEACHER" || role === "ADMIN") return "/teacher/items";
  return "/";
}

export function isStaff(role: string | undefined | null): boolean {
  return role === "TEACHER" || role === "ADMIN";
}

const STUDENT_PREFIXES = ["/exam", "/results", "/history"];

/** Trang xác thực công khai (S01, S17, S18): vào được khi chưa đăng nhập. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export type RouteVerdict = "allow" | "login" | "forbidden" | "redirect-home";

/**
 * Quyết định điều hướng theo đường dẫn + vai trò. Chỉ để UX đúng — KHÔNG phải lớp bảo mật
 * (backend mới kiểm quyền thật).
 */
export function routeVerdict(pathname: string, role: string | null | undefined): RouteVerdict {
  const isLogin = pathname === "/login";
  if (!role) return PUBLIC_PATHS.includes(pathname) ? "allow" : "login";
  if (isLogin) return "redirect-home";
  const staffArea = pathname === "/teacher" || pathname.startsWith("/teacher/");
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const studentArea =
    pathname === "/" ||
    STUDENT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (adminArea && role !== "ADMIN") return "forbidden"; // Admin-only (DC-18); GV không vào /admin
  if (staffArea && !isStaff(role)) return "forbidden";
  if (studentArea && isStaff(role)) return "redirect-home";
  return "allow";
}
