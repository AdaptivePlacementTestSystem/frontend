/**
 * Chính sách cho BFF proxy: chỉ chuyển tiếp các đường dẫn đã biết tới backend, chặn truy cập tùy ý.
 * (Không phải lớp phân quyền: backend vẫn kiểm quyền thật.)
 */
const ALLOWED: readonly RegExp[] = [
  /^teacher-review(\/[A-Za-z0-9-]+(\/(decision|confirm-all))?)?$/,
  /^teacher\/tasks\/(reviews|confirms)(\/[A-Za-z0-9-]+(\/confirm-all)?)?$/,
  /^teacher\/items\/[A-Za-z0-9-]+(\/(approve|reject|confirm|remove))?$/,
  /^item-batches\/import\/(preview|upload|grid|save|template)$/,
  /^item-batches\/import\/grid\/[a-f0-9]{64}$/,
  /^item-batches(\/[A-Za-z0-9-]+(\/(assign|assign-preview|reassign|reassign-confirmer|cancel-pending|deadlines|retry-checks|retry-generation|final-check|import|refresh-status)|\/items\/[A-Za-z0-9-]+\/flag-decision)?)?$/,
  /^auth\/me$/,
  /^sessions(\/[A-Za-z0-9-]+(\/(next-item|responses|resume|result|review))?)?$/,
  /^sessions\/active$/,
  /^exam-rounds(\/(mine|[A-Za-z0-9-]+(\/session\/current)?))?$/,
  /^items(\/[A-Za-z0-9-]+)?$/,
  /^placement-profiles\/[A-Za-z0-9._-]+(\/history)?$/,
  /^reports\/(class-distribution|error-patterns|exam-rounds|export-csv|overview)$/,
  /^exam-rounds\/[A-Za-z0-9-]+\/(publish|close)$/,
  /^exam-rounds\/[A-Za-z0-9-]+\/participants$/,
  /^exam-rounds\/[A-Za-z0-9-]+\/participants\/[A-Za-z0-9-]+$/,
  /^exam-rounds\/[A-Za-z0-9-]+\/participants\/import\/(upload|grid|save|template)$/,
  /^exam-rounds\/[A-Za-z0-9-]+\/participants\/import\/grid\/[A-Za-z0-9-]+$/,
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
