import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { RosterImportView } from "@/features/admin-exam-rounds/roster-import-view";

const getRosterGrid = vi.fn(),
  uploadRoster = vi.fn(),
  removeRosterRow = vi.fn(),
  clearRosterGrid = vi.fn(),
  saveRosterGrid = vi.fn();
const notifyError = vi.fn();
const downloadRosterTemplate = vi.fn();
const saveBlob = vi.fn();
vi.mock("@/features/admin-exam-rounds/api", () => ({
  getRosterGrid: (...args: unknown[]) => getRosterGrid(...args),
  uploadRoster: (...args: unknown[]) => uploadRoster(...args),
  removeRosterRow: (...args: unknown[]) => removeRosterRow(...args),
  clearRosterGrid: (...args: unknown[]) => clearRosterGrid(...args),
  saveRosterGrid: (...args: unknown[]) => saveRosterGrid(...args),
  downloadRosterTemplate: (...args: unknown[]) => downloadRosterTemplate(...args),
}));
vi.mock("@/lib/download", () => ({ saveBlob: (...args: unknown[]) => saveBlob(...args) }));
vi.mock("@/lib/api/notify-error", () => ({
  notifyError: (...args: unknown[]) => notifyError(...args),
}));
function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RosterImportView roundId="round-1" />
    </QueryClientProvider>,
  );
}
const row = { studentId: "student-1", studentCode: "SV01", note: "Ghi chú" };

describe("lưới danh sách thi", () => {
  beforeEach(() => {
    saveBlob.mockReset();
    downloadRosterTemplate
      .mockReset()
      .mockResolvedValue({ blob: new Blob(["data"]), filename: "mau.xlsx" });
    getRosterGrid.mockReset().mockResolvedValue({ grid: [], operationId: null });
    uploadRoster.mockReset().mockResolvedValue({
      grid: [row],
      operationId: "op-1",
      added: 1,
      ignoredDuplicates: 0,
      rejected: [{ row: 3, studentCode: "bad", reason: "MSSV không tồn tại" }],
    });
    removeRosterRow.mockReset().mockResolvedValue({ grid: [], operationId: "op-2" });
    clearRosterGrid.mockReset().mockResolvedValue(undefined);
    saveRosterGrid.mockReset().mockResolvedValue({ operationId: "op-1", added: 1 });
    notifyError.mockReset();
  });
  it("tải file mẫu từ backend", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole("button", { name: "Tải file mẫu" }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), "mau.xlsx"));
    expect(downloadRosterTemplate).toHaveBeenCalledWith("round-1");
  });
  it("hiển thị dòng lỗi, xác nhận trước khi lưu và chỉ báo thành công sau API", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderView();
    await screen.findByText("Chưa có thí sinh trong lưới.");
    const file = new File(["data"], "roster.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await user.upload(screen.getByLabelText("File Excel"), file);
    await user.click(screen.getByRole("button", { name: "Tải lên" }));
    expect(await screen.findByText(/MSSV không tồn tại/)).toBeInTheDocument();
    expect(screen.getByText("SV01")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu danh sách" }));
    expect(await screen.findByText("Đã lưu 1 thí sinh vào kỳ thi.")).toBeInTheDocument();
    expect(saveRosterGrid).toHaveBeenCalledWith("round-1", "op-1");
    confirm.mockRestore();
  });
  it("giữ nguyên lưới và mã thao tác để thử lại khi lưu thất bại", async () => {
    getRosterGrid.mockResolvedValue({ grid: [row], operationId: "op-1" });
    saveRosterGrid.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderView();
    await screen.findByText("SV01");
    await user.click(screen.getByRole("button", { name: "Lưu danh sách" }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(screen.getByText("SV01")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu danh sách" }));
    expect(await screen.findByText("Đã lưu 1 thí sinh vào kỳ thi.")).toBeInTheDocument();
    expect(saveRosterGrid).toHaveBeenNthCalledWith(2, "round-1", "op-1");
    confirm.mockRestore();
  });
  it("cho phép xóa lưới đã hết hạn", async () => {
    getRosterGrid.mockRejectedValue(new ApiError(410, "IMPORT_GRID_EXPIRED", "expired"));
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByRole("button", { name: "Xóa lưới hết hạn" }));
    expect(await screen.findByText("Chưa có thí sinh trong lưới.")).toBeInTheDocument();
  });
});
