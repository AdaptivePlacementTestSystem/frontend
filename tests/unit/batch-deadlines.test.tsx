import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BatchDeadlines } from "@/features/admin-item-batches/batch-deadlines";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest: request }));

describe("đổi hạn lô", () => {
  it("yêu cầu lý do và gửi lý do cùng hai hạn", async () => {
    request.mockResolvedValue({});
    const saved = vi.fn();
    render(<BatchDeadlines batchId="batch" onSaved={saved} />);
    fireEvent.change(screen.getByLabelText(/Hạn vòng A/), {
      target: { value: "2099-01-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/Hạn vòng B/), {
      target: { value: "2099-01-02T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hạn" }));
    expect(screen.getByRole("status")).toHaveTextContent("lý do");
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Lý do đổi hạn/), {
      target: { value: " Điều chỉnh lịch " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hạn" }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/item-batches/batch/deadlines", {
        method: "PATCH",
        body: {
          firstDueAt: new Date("2099-01-01T10:00").toISOString(),
          secondDueAt: new Date("2099-01-02T10:00").toISOString(),
          reason: "Điều chỉnh lịch",
        },
      }),
    );
    expect(saved).toHaveBeenCalledOnce();
  });
});
