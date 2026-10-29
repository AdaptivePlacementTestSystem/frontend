import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtClaims, isExpired } from "@/lib/auth/jwt";
import { TOKEN_COOKIE, homeFor, routeVerdict } from "@/lib/auth/roles";

/**
 * Điều hướng theo vai trò (Next 16: `proxy.ts` thay cho `middleware.ts`). CHỈ để trải nghiệm đúng — không phải lớp
 * bảo mật: token chỉ được giải mã (không xác minh chữ ký), backend mới kiểm quyền thật.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const claims = decodeJwtClaims(req.cookies.get(TOKEN_COOKIE)?.value);
  const role = claims && !isExpired(claims) ? (claims.role ?? null) : null;

  switch (routeVerdict(pathname, role)) {
    case "allow":
      return NextResponse.next();
    case "login": {
      const url = new URL("/login", req.url);
      if (pathname !== "/") url.searchParams.set("next", pathname + search);
      const res = NextResponse.redirect(url);
      if (req.cookies.has(TOKEN_COOKIE)) res.cookies.delete(TOKEN_COOKIE); // token hết hạn/hỏng
      return res;
    }
    case "forbidden":
      return NextResponse.redirect(new URL("/403", req.url));
    case "redirect-home":
      return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
}

export const config = {
  // Bỏ qua tài nguyên tĩnh, API (BFF tự xử lý) và trang lỗi công khai
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|403|404).*)"],
};
