import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportBatch } from "@/features/admin-item-batches/import-batch";

const { request, upload, push } = vi.hoisted(() => ({
  request: vi.fn(),
  upload: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ apiRequest: request, apiUpload: upload }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("question import grid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  it("loads the server grid and retries using only the operation id", async () => {
    request.mockResolvedValueOnce({
      rows: [
        { rowKey: "abc", candidate: { content: "A question", skill: "GRAMMAR", cefrTarget: "A2" } },
      ],
      operationId: "op",
    });
    request.mockRejectedValueOnce(new Error("Mất kết nối"));
    request.mockResolvedValueOnce({ batchId: "batch-1" });
    render(<ImportBatch />);
    expect(await screen.findByText("A question")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu lô" }));
    expect(await screen.findByText("Mất kết nối")).toBeInTheDocument();
    expect(screen.getByText("A question")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu lô" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/item-batches/batch-1"));
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/item-batches/import/save",
      expect.objectContaining({ body: { name: "", operationId: "op" } }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/item-batches/import/save",
      expect.objectContaining({ body: { name: "", operationId: "op" } }),
    );
  });
});
