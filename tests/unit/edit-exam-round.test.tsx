import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditExamRoundView } from "@/features/admin-exam-rounds/edit-exam-round-view";
const getExamRound = vi.fn(),
  updateExamRound = vi.fn(),
  push = vi.fn();
vi.mock("@/features/admin-exam-rounds/api", () => ({
  getExamRound: (...args: unknown[]) => getExamRound(...args),
  updateExamRound: (...args: unknown[]) => updateExamRound(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/notify-error", () => ({ notifyError: vi.fn() }));
function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EditExamRoundView roundId="round-1" />
    </QueryClientProvider>,
  );
}
const round = {
  id: "round-1",
  title: "Kỳ thi",
  opensAt: "2030-01-01T09:00:30Z",
  closesAt: "2030-01-01T11:00:30Z",
  durationMinutes: 45,
  status: "DRAFT",
  effectiveStatus: "DRAFT",
};
describe("sửa kỳ thi", () => {
  beforeEach(() => {
    getExamRound.mockReset().mockResolvedValue(round);
    updateExamRound.mockReset().mockResolvedValue({});
    push.mockReset();
  });
  it("chỉ gửi trường đã sửa và giữ chính xác giây của thời gian không đổi", async () => {
    const user = userEvent.setup();
    renderView();
    const name = await screen.findByLabelText("Tên kỳ thi");
    await user.clear(name);
    await user.type(name, "Tên mới");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(updateExamRound).toHaveBeenCalledWith("round-1", { name: "Tên mới" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/exam-rounds/round-1"));
  });
  it("kỳ đang mở chỉ hiển thị giờ đóng và từ chối rút ngắn", async () => {
    getExamRound.mockResolvedValue({ ...round, effectiveStatus: "OPEN" });
    const user = userEvent.setup();
    renderView();
    const closes = await screen.findByLabelText("Thời gian đóng");
    expect(screen.queryByLabelText("Thời gian mở")).not.toBeInTheDocument();
    fireEvent.change(closes, { target: { value: "2029-12-31T12:00" } });
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(updateExamRound).not.toHaveBeenCalled();
  });
  it("kỳ đã công bố không cho sửa tên và thời lượng", async () => {
    getExamRound.mockResolvedValue({ ...round, effectiveStatus: "SCHEDULED" });
    renderView();
    await screen.findByLabelText("Thời gian mở");
    expect(screen.queryByLabelText("Tên kỳ thi")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Thời lượng (phút)")).not.toBeInTheDocument();
  });
});
