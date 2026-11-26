import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminItemBank } from "@/features/admin-item-batches/admin-item-bank";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isLoading: false,
    error: null,
    data: [
      {
        id: "item-1",
        content: "Example question",
        status: "FINAL_APPROVED",
        skill: "GRAMMAR",
        cefrTarget: "B1",
        irtB: 0.5,
        options: { A: "one", B: "two", C: "three", D: "four" },
        correctAnswer: "A",
      },
    ],
  }),
}));

describe("AdminItemBank", () => {
  it("hiển thị dữ liệu và lọc tìm kiếm", () => {
    render(<AdminItemBank />);
    expect(screen.getByText("Example question")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ngữ pháp" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tìm theo nội dung hoặc mã câu"), {
      target: { value: "không tồn tại" },
    });
    expect(screen.getByText("Không tìm thấy câu hỏi phù hợp.")).toBeInTheDocument();
  });
  it("lọc theo kỹ năng và hiển thị chi tiết câu", () => {
    render(<AdminItemBank />);
    fireEvent.change(screen.getByLabelText("Kỹ năng"), { target: { value: "VOCABULARY" } });
    expect(screen.getByText("Không tìm thấy câu hỏi phù hợp.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Kỹ năng"), { target: { value: "GRAMMAR" } });
    fireEvent.click(screen.getByRole("button", { name: "Xem" }));
    expect(screen.getByRole("region", { name: "Chi tiết câu hỏi" })).toHaveTextContent(
      "A. one — Đáp án",
    );
  });
});
