import { NextResponse } from "next/server";
import { ErrorCode } from "@apt/shared-types";
import { env } from "@/lib/env";

const KNOWN: ReadonlySet<string> = new Set<string>(Object.values(ErrorCode));

export interface Upstream {
  status: number;
  ok: boolean;
  data: unknown;
}

export function bffError(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/** POST JSON tới backend (phía server/BFF). Trả `null` khi mất mạng/quá thời gian. */
export async function postUpstream(
  path: string,
  body: unknown,
  token?: string,
): Promise<Upstream | null> {
  try {
    const res = await fetch(`${env.API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return { status: res.status, ok: res.ok, data: await res.json().catch(() => null) };
  } catch {
    return null;
  }
}

/** Mã nghiệp vụ backend trả về nếu thuộc danh sách chung (@apt/shared-types), ngược lại `null`. */
export function upstreamCode(data: unknown): string | null {
  const code = data && typeof data === "object" ? (data as Record<string, unknown>).code : null;
  return typeof code === "string" && KNOWN.has(code) ? code : null;
}
