import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExamRoundDetailView } from "@/features/admin-exam-rounds/exam-round-detail-view";

const getExamRound = vi.fn();
const listExamRounds = vi.fn();
const listParticipants = vi.fn();
const closeExamRound = vi.fn();
const publishExamRound = vi.fn();
vi.mock("@/features/admin-exam-rounds/api", () => ({
  getExamRound: (...args: unknown[]) => getExamRound(...args),
  listExamRounds: (...args: unknown[]) => listExamRounds(...args),
  listParticipants: (...args: unknown[]) => listParticipants(...args),
  closeExamRound: (...args: unknown[]) => closeExamRound(...args),
  publishExamRound: (...args: unknown[]) => publishExamRound(...args),
}));

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExamRoundDetailView roundId="round-1" />
    </QueryClientProvider>,
  );
}

describe("chi tiết kỳ thi", () => {
  beforeEach(() => {
    getExamRound.mockReset();
    listExamRounds.mockReset().mockResolvedValue([{ id: "round-1", participantCount: 1 }]);
    listParticipants
      .mockReset()
      .mockResolvedValue({
        data: [
          {
            studentId: "student-1",
            studentCode: "SV01",
            fullName: "An",
            status: "IN_PROGRESS",
            overdue: true,
            startedAt: null,
            completedAt: null,
            cefrLevel: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        summary: { notStarted: 0, inProgress: 1, completed: 0, abandoned: 0 },
      });
    closeExamRound.mockReset().mockResolvedValue({});
    publishExamRound.mockReset().mockResolvedValue({});
    getExamRound.mockResolvedValue({
      id: "round-1",
      title: "Kỳ thi kiểm thử",
      opensAt: "2026-11-27T01:00:00Z",
      closesAt: "2026-11-27T03:00:00Z",
      durationMinutes: 45,
      status: "SCHEDULED",
      effectiveStatus: "OPEN",
    });
  });

  it("hiển thị dữ liệu và trạng thái hiệu lực từ API", async () => {
    renderView();
    expect(await screen.findByRole("heading", { name: "Kỳ thi kiểm thử" })).toBeInTheDocument();
    expect(screen.getByText("Đang mở")).toBeInTheDocument();
    expect(screen.getByText("45 phút")).toBeInTheDocument();
    expect(getExamRound).toHaveBeenCalledWith("round-1", expect.anything());
    expect(await screen.findByText("SV01")).toBeInTheDocument();
    expect(screen.getByText(/quá hạn, chờ xử lý/)).toBeInTheDocument();
  });

  it("chỉ đóng kỳ sau khi xác nhận", async () => {
    const user = userEvent.setup();
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    renderView();
    await screen.findByText("SV01");
    await user.click(screen.getByRole("button", { name: "Đóng kỳ" }));
    expect(closeExamRound).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Đóng kỳ" }));
    expect(closeExamRound).toHaveBeenCalledWith("round-1");
    confirm.mockRestore();
  });

  it("hiển thị lỗi và cho phép thử lại", async () => {
    getExamRound.mockRejectedValueOnce(new Error("Lỗi"));
    const user = userEvent.setup();
    renderView();
    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Kỳ thi kiểm thử" })).toBeInTheDocument();
  });
});
