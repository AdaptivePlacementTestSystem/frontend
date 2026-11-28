import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BatchReassign } from "@/features/admin-item-batches/batch-reassign";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest: request }));

describe("giao lại câu DRAFT", () => {
  it("gửi GV A cũ và mới, không cho chọn GV B", async () => {
    request.mockImplementation((path: string) =>
      path === "/teachers"
        ? Promise.resolve({
            total: 3,
            items: [
              { id: "a", fullName: "GV A", role: "TEACHER", isActive: true },
              { id: "b", fullName: "GV B", role: "TEACHER", isActive: true },
              { id: "c", fullName: "GV C", role: "TEACHER", isActive: true },
            ],
          })
        : Promise.resolve({ reassigned: 2 }),
    );
    const saved = vi.fn();
    render(<BatchReassign batchId="batch" confirmerId="b" onSaved={saved} />);
    await screen.findAllByRole("option", { name: "GV C" });
    fireEvent.change(screen.getByLabelText("GV A hiện tại"), { target: { value: "a" } });
    const destination = screen.getByLabelText("GV A thay thế");
    expect(destination).not.toHaveTextContent("GV B");
    fireEvent.change(destination, { target: { value: "c" } });
    fireEvent.change(screen.getByLabelText("Lý do giao lại"), { target: { value: "Thay người" } });
    fireEvent.click(screen.getByRole("button", { name: "Giao lại câu DRAFT" }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/item-batches/batch/reassign", {
        method: "POST",
        body: { fromAssigneeId: "a", toAssigneeId: "c", reason: "Thay người" },
      }),
    );
    expect(await screen.findByText("Đã giao lại 2 câu DRAFT.")).toBeInTheDocument();
    expect(saved).toHaveBeenCalledOnce();
  });
});
