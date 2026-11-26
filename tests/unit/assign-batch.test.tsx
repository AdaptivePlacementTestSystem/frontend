import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssignBatch } from "@/features/admin-item-batches/assign-batch";

const { request, push, refresh } = vi.hoisted(() => ({
  request: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/api/client", () => ({ apiRequest: request }));

describe("giao việc lô câu hỏi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "POST") return Promise.resolve({ assigned: 2 });
      if (path === "/teachers")
        return Promise.resolve({
          items: [
            { id: "a", fullName: "Giảng viên An", role: "TEACHER", isActive: true },
            { id: "b", fullName: "Giảng viên Bình", role: "TEACHER", isActive: true },
          ],
          total: 2,
        });
      return Promise.resolve({
        batch: { status: "READY_TO_ASSIGN", name: "Lô B1", cefrTarget: "B1" },
        items: [
          { id: "i1", content: "Câu một", status: "DRAFT" },
          { id: "i2", content: "Câu hai", status: "DRAFT" },
        ],
        total: 2,
      });
    });
  });

  it("chọn A/B, xem trước và gửi phân công với hạn đã chọn", async () => {
    render(<AssignBatch batchId="batch" />);
    expect(await screen.findByText("Lô B1")).toBeInTheDocument();
    const a = screen.getByRole("heading", { name: /duyệt sơ bộ/ }).closest("section")!;
    const b = screen.getByRole("heading", { name: /xác nhận \(Vai B\)/ }).closest("section")!;
    fireEvent.click(within(a).getByLabelText("Giảng viên An"));
    fireEvent.click(within(b).getByLabelText("Giảng viên Bình"));
    fireEvent.change(screen.getByLabelText("Hạn vòng A"), {
      target: { value: "2099-01-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Hạn vòng B"), {
      target: { value: "2099-01-02T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xem trước phân công" }));
    expect(screen.getByText("Câu một")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận giao việc" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/item-batches/batch"));
    expect(request).toHaveBeenCalledWith(
      "/item-batches/batch/assign",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          assignments: [
            { itemId: "i1", reviewerId: "a", confirmerId: "b" },
            { itemId: "i2", reviewerId: "a", confirmerId: "b" },
          ],
        }),
      }),
    );
  });
});
