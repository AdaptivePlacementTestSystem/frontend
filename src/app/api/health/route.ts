import { env } from "@/lib/env";

// Health "sâu" cho monitor ngoài và smoke test sau deploy: Next phải chạy VÀ backend phải sẵn sàng.
// Trả 503 khi không khỏe (gói free của monitor không kiểm từ khóa, chỉ dựa vào mã trạng thái).
// Không trả chi tiết lỗi nội bộ.
export const dynamic = "force-dynamic";

type CheckState = "up" | "down";

export async function GET() {
  let backend: CheckState = "down";
  try {
    const res = await fetch(`${env.API_BASE_URL}/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    backend = res.ok ? "up" : "down";
  } catch {
    backend = "down";
  }

  const healthy = backend === "up";
  return Response.json(
    { status: healthy ? "ok" : "degraded", checks: { frontend: "up", backend } },
    { status: healthy ? 200 : 503 },
  );
}
