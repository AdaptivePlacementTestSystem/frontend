import { NextResponse } from "next/server";
import { z } from "zod";
import { bffError, postUpstream } from "@/lib/api/bff-upstream";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.email().trim() });

/** Quên mật khẩu (UCSV09, BR-14): backend luôn 202 dù email có tồn tại hay không; ở đây cũng không phân biệt. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bffError(400, "VALIDATION_FAILED", "Email không hợp lệ.");

  const upstream = await postUpstream("/auth/forgot-password", parsed.data);
  if (!upstream) return bffError(502, "NETWORK", "Không kết nối được máy chủ.");
  if (upstream.status === 429) return bffError(429, "RATE_LIMITED", "Quá nhiều yêu cầu."); // theo email + IP
  if (!upstream.ok) return bffError(502, "UNKNOWN", "Máy chủ gặp lỗi, vui lòng thử lại.");
  return new NextResponse(null, { status: 202 });
}
