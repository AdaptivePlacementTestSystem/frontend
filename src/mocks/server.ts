import { setupServer } from "msw/node";
import { createMockApi } from "./handlers";

/** Máy chủ MSW dùng cho Vitest và chế độ `MOCK_API=1` (chặn fetch phía server tới backend). */
export function createMockServer(now: () => number = Date.now) {
  const api = createMockApi(now);
  const server = setupServer(...api.handlers);
  return { server, db: api.db };
}
