import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffViewer } from "@/components/review/diff-viewer";
import { TasksTabs } from "@/components/review/tasks-tabs";
import { DueBadge } from "@/components/review/due-badge";
import { SoftFlags } from "@/components/review/soft-flags";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher/tasks/reviews",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

describe("Teacher Review Components (S33, S11, S34, S35)", () => {
  describe("TasksTabs Component", () => {
    it("renders both reviews and confirms tabs with count badges", () => {
      render(<TasksTabs pendingReviews={5} pendingConfirms={2} />);

      expect(screen.getByTestId("tasks-tabs")).toBeInTheDocument();
      expect(screen.getByTestId("tab-reviews")).toHaveTextContent("Cần duyệt");
      expect(screen.getByTestId("tab-reviews")).toHaveTextContent("5");
      expect(screen.getByTestId("tab-confirms")).toHaveTextContent("Cần xác nhận");
      expect(screen.getByTestId("tab-confirms")).toHaveTextContent("2");
    });
  });

  describe("DueBadge Component (C-DUE)", () => {
    it("renders 'Quá hạn' in destructive style when overdue", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      render(<DueBadge dueAt={pastDate} />);

      const badge = screen.getByTestId("due-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Quá hạn");
    });

    it("renders days remaining when in the future", () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      render(<DueBadge dueAt={futureDate} />);

      const badge = screen.getByTestId("due-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Còn 5 ngày");
    });
  });

  describe("SoftFlags Component (C-FLAG)", () => {
    it("renders AI soft flag reasons and tags", () => {
      const flags = [
        {
          level: "WARNING",
          reasonCodes: ["DUPLICATE_SUSPECTED"],
          suspectedDuplicateId: "item-dup-12345678",
        },
      ];

      render(<SoftFlags flags={flags} />);

      expect(screen.getByTestId("review-flags")).toBeInTheDocument();
      expect(screen.getByText(/Gần giống một câu trong ngân hàng/i)).toBeInTheDocument();
      expect(screen.getByText(/Mã câu nghi trùng/i)).toBeInTheDocument();
    });
  });

  describe("DiffViewer Component (C-DIFF)", () => {
    it("renders notice when item has not been edited (original is null)", () => {
      render(
        <DiffViewer
          original={null}
          current={{
            content: "What is your name?",
            options: { A: "A", B: "B", C: "C", D: "D" },
            correctAnswer: "A",
          }}
        />,
      );

      expect(screen.getByText(/Câu hỏi này chưa qua chỉnh sửa/i)).toBeInTheDocument();
    });

    it("renders side-by-side comparison with [Đã đổi] labels when modified", () => {
      const original = {
        content: "She ____ to school yesterday.",
        options: { A: "go", B: "went", C: "gone", D: "goes" },
        correctAnswer: "A",
        explanation: "Old explanation",
      };

      const current = {
        content: "She ____ to school yesterday morning.",
        options: { A: "go", B: "went", C: "has gone", D: "goes" },
        correctAnswer: "B",
        explanation: "New explanation corrected by Teacher A",
      };

      render(<DiffViewer original={original} current={current} />);

      expect(screen.getByTestId("diff-viewer")).toBeInTheDocument();
      expect(screen.getByText("Bản gốc (Import / AI)")).toBeInTheDocument();
      expect(screen.getByText("Bản GV A đã sửa")).toBeInTheDocument();

      // Check for [Đã đổi] badges
      const changedBadges = screen.getAllByText(/\[Đã đổi\]/i);
      expect(changedBadges.length).toBeGreaterThan(0);
    });
  });
});
