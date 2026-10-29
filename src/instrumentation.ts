/**
 * Chế độ backend giả: `MOCK_API=1` ⇒ chặn mọi fetch phía server (BFF, Server Component) tới API_BASE_URL
 * và trả dữ liệu mẫu (src/mocks). Không bao giờ bật ở môi trường thật.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.MOCK_API !== "1") return;
  const { createMockServer } = await import("./mocks/server");
  const { server } = createMockServer();
  server.listen({ onUnhandledRequest: "bypass" });
  console.warn("[mock] MOCK_API=1 — đang dùng backend giả, KHÔNG phải dữ liệu thật.");
}
