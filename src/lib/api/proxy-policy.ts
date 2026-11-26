/**
 * Chính sách cho BFF proxy: chỉ chuyển tiếp các đường dẫn đã biết tới backend, chặn truy cập tùy ý.
 * (Không phải lớp phân quyền: backend vẫn kiểm quyền thật.)
 */
const ALLOWED: readonly RegExp[] = [
  /^teacher-review(\/[A-Za-z0-9-]+(\/(decision|confirm-all))?)?$/,
  /^item-batches\/import\/(preview|save)$/,
  /^item-batches(\/[A-Za-z0-9-]+(\/(assign|deadlines))?)?$/,
  /^auth\/me$/,
  /^sessions(\/[A-Za-z0-9-]+(\/(next-item|responses|resume|result|review))?)?$/,
  /^sessions\/active$/,
  /^exam-rounds(\/(mine|[A-Za-z0-9-]+(\/session\/current)?))?$/,
  /^items(\/(generate-explanation|[A-Za-z0-9-]+(\/(approve|reject|clone))?))?$/,
  /^placement-profiles\/[A-Za-z0-9._-]+(\/history)?$/,
  /^reports\/(class-distribution|error-patterns|export-csv|overview)$/,
  /^(students|teachers)(\/[A-Za-z0-9-]+)?$/,
  /^users\/[A-Za-z0-9-]+\/(lock|unlock|resend-temporary-password|role)$/,
  // Import tài khoản bằng file (S19): `import` là đoạn cố định, không trùng id người dùng
  /^users\/import\/(upload|grid|save|save-status|template)$/,
  /^users\/import\/grid\/[A-Za-z0-9-]+$/,
];

export function isAllowedProxyPath(segments: readonly string[]): boolean {
  if (segments.length === 0) return false;
  for (const s of segments) {
    if (!s || s === "." || s === ".." || s.includes("/") || s.includes("\\") || s.includes("%")) {
      return false;
    }
  }
  const joined = segments.join("/");
  return ALLOWED.some((re) => re.test(joined));
}

const PASS_THROUGH_RESPONSE_HEADERS = ["content-type", "content-disposition"] as const;

/** Chỉ chuyển một số header phản hồi cần thiết; không chuyển Set-Cookie hay header nội bộ của backend. */
export function filterResponseHeaders(src: Headers): Headers {
  const out = new Headers();
  for (const name of PASS_THROUGH_RESPONSE_HEADERS) {
    const v = src.get(name);
    if (v) out.set(name, v);
  }
  return out;
}
