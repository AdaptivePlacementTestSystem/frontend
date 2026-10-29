import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button (kiểm tra cấu hình test)", () => {
  it("hiển thị nhãn và trạng thái disabled", () => {
    render(<Button disabled>Bắt đầu bài thi</Button>);
    const btn = screen.getByRole("button", { name: "Bắt đầu bài thi" });
    expect(btn).toBeDisabled();
  });
});
