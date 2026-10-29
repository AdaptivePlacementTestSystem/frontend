// Liveness: chỉ cho biết tiến trình Next đang chạy. Dùng cho HEALTHCHECK của Docker.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
