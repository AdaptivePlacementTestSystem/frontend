import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerateBatch } from "@/features/admin-item-batches/generate-batch";

const { request, push } = vi.hoisted(() => ({ request: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest: request }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  vi.clearAllMocks();
});
describe("queued AI generation", () => {
  it("reuses the operation id after a lost response", async () => {
    vi.stubGlobal("crypto", {
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2]).buffer) },
      randomUUID: vi.fn().mockReturnValue("operation-id"),
    });
    request.mockRejectedValueOnce(new Error("Mất kết nối"));
    request.mockResolvedValueOnce({ batchId: "batch-1" });
    render(<GenerateBatch />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo lô" }));
    expect(await screen.findByText("Mất kết nối")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tạo lô" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/item-batches/batch-1"));
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/item-batches/generate",
      expect.objectContaining({ body: expect.objectContaining({ operationId: "operation-id" }) }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/item-batches/generate",
      expect.objectContaining({ body: expect.objectContaining({ operationId: "operation-id" }) }),
    );
  });
});
