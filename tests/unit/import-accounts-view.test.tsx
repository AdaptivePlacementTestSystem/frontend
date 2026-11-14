import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportAccountsView } from "@/features/admin-import/import-accounts-view";
import { ApiError } from "@/lib/api/errors";
import type {
  AccountKind,
  ImportGridRow,
  ImportSaveStatus,
  ImportUploadResult,
} from "@/lib/api/types";

const api = vi.hoisted(() => ({
  uploadImportFile: vi.fn(),
  getImportGrid: vi.fn(),
  removeImportRow: vi.fn(),
  clearImportGrid: vi.fn(),
  saveImportGrid: vi.fn(),
  getImportStatus: vi.fn(),
  downloadImportTemplate: vi.fn(),
}));
vi.mock("@/lib/api/endpoints", () => api);
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: nav.replace }) }));

const row = (n: number): ImportGridRow => ({
  rowKey: `k${n}`,
  code: `SV${n}`,
  fullName: `Người ${n}`,
  email: `u${n}@e.test`,
});
const xlsx = (name: string) =>
  new File(["x"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
const result = (over: Partial<ImportUploadResult> = {}): ImportUploadResult => ({
  grid: [row(1), row(2)],
  rejected: [],
  existing: [],
  added: 2,
  ignoredDuplicates: 0,
  ...over,
});

function renderView(kind: AccountKind = "STUDENT") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ImportAccountsView initialKind={kind} />
    </QueryClientProvider>,
  );
}

const grids: Record<string, ImportGridRow[]> = {};
let status: ImportSaveStatus = { status: "NONE" };

describe("ImportAccountsView (S19)", () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    nav.replace.mockReset();
    grids.STUDENT = [];
    grids.TEACHER = [];
    status = { status: "NONE" };
    api.getImportGrid.mockImplementation(async (kind: string) => ({ grid: grids[kind] }));
    api.getImportStatus.mockImplementation(async () => status);
    api.clearImportGrid.mockResolvedValue(undefined);
    api.saveImportGrid.mockResolvedValue({ total: 2 });
    api.removeImportRow.mockImplementation(async (kind: string, key: string) => ({
      grid: (grids[kind] ?? []).filter((r) => r.rowKey !== key),
    }));
  });

  const upload = async (user: ReturnType<typeof userEvent.setup>, ...files: File[]) => {
    await user.upload(screen.getByTestId("import-file"), files);
  };

  describe("chọn loại tài khoản và bảng", () => {
    it("mặc định theo `kind` truyền vào; cột và liên kết mẫu đúng loại", async () => {
      renderView("TEACHER");

      expect(await screen.findByTestId("import-grid-title")).toHaveTextContent(
        "Bảng sẽ tạo (0 tài khoản)",
      );
      expect(screen.getByTestId("import-kind-teacher")).toHaveAttribute("aria-checked", "true");
      expect(screen.getByTestId("import-template-teacher")).toBeInTheDocument();
      expect(screen.queryByTestId("import-template-student")).not.toBeInTheDocument();
    });

    it("bảng rỗng: nút Lưu và Xóa cả bảng bị vô hiệu, có chữ hướng dẫn", async () => {
      renderView();

      expect(
        await screen.findByText("Chưa có dòng nào. Tải file .xlsx để bắt đầu."),
      ).toBeInTheDocument();
      expect(screen.getByTestId("import-save")).toBeDisabled();
      expect(screen.getByTestId("import-clear")).toBeDisabled();
    });

    it("đổi loại: tải bảng của loại kia, cập nhật URL, mỗi loại một bảng riêng", async () => {
      grids.STUDENT = [row(1)];
      grids.TEACHER = [row(5), row(6)];
      const user = userEvent.setup();
      renderView("STUDENT");
      await waitFor(() =>
        expect(screen.getByTestId("import-grid-title")).toHaveTextContent("(1 tài khoản)"),
      );

      await user.click(screen.getByTestId("import-kind-teacher"));

      await waitFor(() =>
        expect(screen.getByTestId("import-grid-title")).toHaveTextContent("(2 tài khoản)"),
      );
      expect(api.getImportGrid).toHaveBeenCalledWith("TEACHER", expect.anything());
      expect(nav.replace).toHaveBeenCalledWith("/admin/users/import?kind=TEACHER", {
        scroll: false,
      });
      expect(screen.getByRole("columnheader", { name: "Mã GV" })).toBeInTheDocument();
    });

    it("hiện các dòng của bảng kèm số thứ tự", async () => {
      grids.STUDENT = [row(1), row(2)];
      renderView();

      const first = await screen.findByTestId("import-row-k1");
      expect(first).toHaveTextContent("1");
      expect(first).toHaveTextContent("SV1");
      expect(first).toHaveTextContent("Người 1");
      expect(first).toHaveTextContent("u1@e.test");
    });
  });

  describe("tải file", () => {
    it("tải một file: gọi API đúng loại, bảng cập nhật, báo số dòng thêm", async () => {
      api.uploadImportFile.mockResolvedValue(result());
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      const file = xlsx("sv.xlsx");
      await upload(user, file);

      await waitFor(() => expect(api.uploadImportFile).toHaveBeenCalledWith("STUDENT", file));
      expect(await screen.findByTestId("import-row-k2")).toBeInTheDocument();
      expect(screen.getByTestId("import-grid-title")).toHaveTextContent("(2 tài khoản)");
      expect(screen.getByTestId("import-notes")).toHaveTextContent("sv.xlsx: thêm 2 dòng.");
      expect(screen.getByTestId("import-save")).toBeEnabled();
    });

    it("nhiều file: tải lần lượt, cộng dồn vào bảng, ghi chú từng file và số dòng bỏ qua", async () => {
      api.uploadImportFile
        .mockResolvedValueOnce(result({ grid: [row(1), row(2)], added: 2 }))
        .mockResolvedValueOnce(
          result({ grid: [row(1), row(2), row(3)], added: 1, ignoredDuplicates: 1 }),
        );
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      await upload(user, xlsx("a.xlsx"), xlsx("b.xlsx"));

      await waitFor(() =>
        expect(screen.getByTestId("import-grid-title")).toHaveTextContent("(3 tài khoản)"),
      );
      const notes = screen.getByTestId("import-notes");
      expect(notes).toHaveTextContent("a.xlsx: thêm 2 dòng.");
      expect(notes).toHaveTextContent("b.xlsx: thêm 1 dòng, bỏ qua 1 dòng đã có trong bảng.");
      expect(api.uploadImportFile).toHaveBeenCalledTimes(2);
    });

    it("file lỗi (sai tiêu đề): hiện thông điệp cụ thể của backend, file khác vẫn tải tiếp", async () => {
      api.uploadImportFile
        .mockRejectedValueOnce(
          new ApiError(
            400,
            "IMPORT_FILE_INVALID",
            "Sai tiêu đề cột. Dòng đầu phải là: MSSV, Họ tên, Email.",
          ),
        )
        .mockResolvedValueOnce(result());
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      await upload(user, xlsx("hong.xlsx"), xlsx("tot.xlsx"));

      const notes = await screen.findByTestId("import-notes");
      await waitFor(() => expect(notes).toHaveTextContent("tot.xlsx: thêm 2 dòng."));
      expect(notes).toHaveTextContent("hong.xlsx: không tải được.");
      expect(notes).toHaveTextContent("Sai tiêu đề cột");
    });

    it("lỗi mạng: báo chung bằng chữ của ứng dụng", async () => {
      api.uploadImportFile.mockRejectedValue(new ApiError(0, "NETWORK", "x"));
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      await upload(user, xlsx("a.xlsx"));

      expect(await screen.findByTestId("import-notes")).toHaveTextContent(
        "Không kết nối được máy chủ",
      );
    });
  });

  describe("popup dòng bị loại và tài khoản đã tồn tại", () => {
    it("không có dòng lỗi: không hiện nút xem", async () => {
      api.uploadImportFile.mockResolvedValue(result());
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      await upload(user, xlsx("a.xlsx"));
      await screen.findByTestId("import-notes");

      expect(screen.queryByTestId("import-rejected-open")).not.toBeInTheDocument();
      expect(screen.queryByTestId("import-existing-open")).not.toBeInTheDocument();
    });

    it("dòng bị loại: nút kèm số lượng, popup liệt kê file, số dòng và lý do", async () => {
      api.uploadImportFile.mockResolvedValue(
        result({
          rejected: [
            { row: 4, code: "INVALID_EMAIL", reason: "x" },
            { row: 5, code: "MISSING_FIELD", reason: "y" },
            { row: 6, code: "DUPLICATE_IN_FILE", reason: "z" },
          ],
        }),
      );
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");
      await upload(user, xlsx("lỗi.xlsx"));

      await user.click(await screen.findByRole("button", { name: "Xem 3 dòng bị loại" }));

      const popup = screen.getByTestId("import-rejected-popup");
      expect(popup).toHaveTextContent("lỗi.xlsx");
      expect(within(popup).getByText("Email không đúng định dạng.")).toBeInTheDocument();
      expect(within(popup).getByText("Thiếu mã, họ tên hoặc email.")).toBeInTheDocument();
      expect(
        within(popup).getByText("Trùng email hoặc mã với một dòng trước trong file."),
      ).toBeInTheDocument();
      expect(within(popup).getAllByRole("row")).toHaveLength(4); // tiêu đề + 3 dòng
    });

    it("tài khoản đã tồn tại: popup riêng, nêu rõ email hay MSSV, không chặn Lưu", async () => {
      api.uploadImportFile.mockResolvedValue(
        result({
          existing: [
            { row: 3, field: "email", value: "co@e.test" },
            { row: 7, field: "code", value: "SV99" },
          ],
        }),
      );
      const user = userEvent.setup();
      renderView("STUDENT");
      await screen.findByTestId("import-grid-title");
      await upload(user, xlsx("a.xlsx"));

      await user.click(await screen.findByRole("button", { name: "Xem 2 tài khoản đã tồn tại" }));

      const popup = screen.getByTestId("import-existing-popup");
      expect(within(popup).getByText("Email đã tồn tại")).toBeInTheDocument();
      expect(within(popup).getByText("MSSV đã tồn tại")).toBeInTheDocument();
      expect(within(popup).getByText("co@e.test")).toBeInTheDocument();
      expect(screen.queryByTestId("import-rejected-open")).not.toBeInTheDocument();
      expect(screen.getByTestId("import-save")).toBeEnabled(); // dòng đã có không chặn Lưu
    });

    it("loại giảng viên: nhãn mã là 'Mã GV đã tồn tại'", async () => {
      api.uploadImportFile.mockResolvedValue(
        result({ existing: [{ row: 2, field: "code", value: "GV1" }] }),
      );
      const user = userEvent.setup();
      renderView("TEACHER");
      await screen.findByTestId("import-grid-title");
      await upload(user, xlsx("gv.xlsx"));

      await user.click(await screen.findByTestId("import-existing-open"));

      expect(
        within(screen.getByTestId("import-existing-popup")).getByText("Mã GV đã tồn tại"),
      ).toBeInTheDocument();
    });

    it("tải file mới thì danh sách lỗi của lần trước bị thay", async () => {
      api.uploadImportFile
        .mockResolvedValueOnce(
          result({ rejected: [{ row: 2, code: "INVALID_EMAIL", reason: "" }] }),
        )
        .mockResolvedValueOnce(result());
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      await upload(user, xlsx("a.xlsx"));
      await screen.findByTestId("import-rejected-open");
      await upload(user, xlsx("b.xlsx"));

      await waitFor(() =>
        expect(screen.queryByTestId("import-rejected-open")).not.toBeInTheDocument(),
      );
    });
  });

  describe("xóa dòng và xóa cả bảng", () => {
    it("xóa một dòng", async () => {
      grids.STUDENT = [row(1), row(2)];
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");

      await user.click(screen.getByTestId("import-delete-k1"));

      await waitFor(() => expect(screen.queryByTestId("import-row-k1")).not.toBeInTheDocument());
      expect(api.removeImportRow).toHaveBeenCalledWith("STUDENT", "k1");
      expect(screen.getByTestId("import-grid-title")).toHaveTextContent("(1 tài khoản)");
    });

    it("xóa cả bảng cần xác nhận", async () => {
      grids.STUDENT = [row(1), row(2)];
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");

      await user.click(screen.getByTestId("import-clear"));
      expect(api.clearImportGrid).not.toHaveBeenCalled();
      expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("Xóa cả bảng?");
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() => expect(api.clearImportGrid).toHaveBeenCalledWith("STUDENT"));
      expect(
        await screen.findByText("Chưa có dòng nào. Tải file .xlsx để bắt đầu."),
      ).toBeInTheDocument();
    });

    it("hủy xác nhận thì không xóa", async () => {
      grids.STUDENT = [row(1)];
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");

      await user.click(screen.getByTestId("import-clear"));
      await user.click(
        within(screen.getByTestId("confirm-dialog")).getByRole("button", { name: "Hủy" }),
      );

      expect(api.clearImportGrid).not.toHaveBeenCalled();
    });
  });

  describe("nút Lưu chạy nền", () => {
    it("bấm Lưu: gọi API đúng loại rồi hỏi trạng thái", async () => {
      grids.STUDENT = [row(1), row(2)];
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");
      const before = api.getImportStatus.mock.calls.length;

      await user.click(screen.getByTestId("import-save"));

      await waitFor(() => expect(api.saveImportGrid).toHaveBeenCalledWith("STUDENT"));
      await waitFor(() => expect(api.getImportStatus.mock.calls.length).toBeGreaterThan(before));
    });

    it("đang chạy nền: hiện tiến độ, khóa Lưu, Xóa, chọn file và đổi loại", async () => {
      grids.STUDENT = [row(1), row(2), row(3), row(4)];
      status = { status: "PROCESSING", total: 4, processed: 1 };
      renderView();

      const progress = await screen.findByTestId("import-progress");
      expect(progress).toHaveTextContent("Đã xử lý 1/4 tài khoản");
      expect(within(progress).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
      expect(screen.getByTestId("import-save")).toBeDisabled();
      expect(screen.getByTestId("import-clear")).toBeDisabled();
      expect(screen.getByTestId("import-file")).toBeDisabled();
      expect(screen.getByTestId("import-delete-k1")).toBeDisabled();
      expect(screen.getByRole("group", { name: /Loại tài khoản/ })).toBeDisabled();
    });

    /** Bấm Lưu và để backend (giả) chuyển sang trạng thái `after` ngay khi nhận lệnh. */
    const saveThenStatus = async (after: ImportSaveStatus) => {
      api.saveImportGrid.mockImplementation(async () => {
        status = after;
        return { total: 2 };
      });
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");
      await user.click(screen.getByTestId("import-save"));
      return user;
    };

    it("xong: báo 'Đã tạo N tài khoản, M email đã xếp hàng gửi.' và làm mới bảng", async () => {
      grids.STUDENT = [row(1), row(2)];
      await saveThenStatus({ status: "DONE", total: 2, processed: 2, created: 2, queued: 2 });

      expect(await screen.findByTestId("import-result")).toHaveTextContent(
        "Đã tạo 2 tài khoản, 2 email đã xếp hàng gửi.",
      );
      expect(screen.getByTestId("import-result")).toHaveTextContent("Gửi lại mật khẩu tạm");
      // đã làm mới bảng sau khi xong
      await waitFor(() => expect(api.getImportGrid.mock.calls.length).toBeGreaterThan(1));
    });

    it("kết quả của lần Lưu cũ còn trong Redis không hiện lại khi mới mở trang", async () => {
      grids.STUDENT = [row(1)];
      status = { status: "DONE", total: 300, processed: 300, created: 300, queued: 300 };
      renderView();
      await screen.findByTestId("import-row-k1");

      expect(screen.queryByTestId("import-result")).not.toBeInTheDocument();
      expect(screen.queryByTestId("import-failed")).not.toBeInTheDocument();
    });

    it("mở lại trang giữa lúc đang Lưu nền: theo dõi tiếp và hiện kết quả khi xong", async () => {
      grids.STUDENT = [row(1), row(2)];
      status = { status: "PROCESSING", total: 2, processed: 1 };
      renderView();
      await screen.findByTestId("import-progress");

      status = { status: "DONE", total: 2, processed: 2, created: 2, queued: 2 };

      expect(await screen.findByTestId("import-result", {}, { timeout: 4000 })).toHaveTextContent(
        "Đã tạo 2 tài khoản",
      );
    });

    it("có thể ẩn thông báo kết quả", async () => {
      grids.STUDENT = [row(1), row(2)];
      const user = await saveThenStatus({
        status: "DONE",
        total: 2,
        processed: 2,
        created: 2,
        queued: 2,
      });
      await screen.findByTestId("import-result");

      await user.click(screen.getByRole("button", { name: "Ẩn" }));

      expect(screen.queryByTestId("import-result")).not.toBeInTheDocument();
    });

    it("thất bại do trùng: báo chưa tạo gì, liệt kê dòng trùng, giữ bảng, cho Lưu lại", async () => {
      grids.STUDENT = [row(1), row(2)];
      await saveThenStatus({
        status: "FAILED",
        total: 2,
        processed: 0,
        error: {
          code: "CONFLICT",
          message: "x",
          conflicts: [{ row: 2, field: "email", value: "u2@e.test" }],
        },
      });

      const failed = await screen.findByTestId("import-failed");
      expect(failed).toHaveTextContent("chưa có tài khoản nào được tạo");
      expect(failed).toHaveTextContent("Dòng 2 trong bảng: Email đã tồn tại (u2@e.test)");
      expect(screen.getByTestId("import-row-k1")).toBeInTheDocument();
      expect(screen.getByTestId("import-save")).toBeEnabled();
    });

    it("thất bại không rõ lý do: thông báo chung", async () => {
      grids.STUDENT = [row(1), row(2)];
      await saveThenStatus({
        status: "FAILED",
        total: 2,
        processed: 0,
        error: { code: "UNKNOWN", message: "x" },
      });

      expect(await screen.findByTestId("import-failed")).toHaveTextContent("Không lưu được");
    });

    it("bảng đã hết hạn khi Lưu (410): báo lỗi và làm trống bảng", async () => {
      grids.STUDENT = [row(1)];
      api.saveImportGrid.mockRejectedValue(new ApiError(410, "IMPORT_GRID_EXPIRED", "x"));
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");

      await user.click(screen.getByTestId("import-save"));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Bảng import đã hết hạn. Vui lòng tải lại file.",
          expect.anything(),
        ),
      );
      await waitFor(() => expect(screen.queryByTestId("import-row-k1")).not.toBeInTheDocument());
    });

    it("đang có lần Lưu khác chạy (409): báo lỗi", async () => {
      grids.STUDENT = [row(1)];
      api.saveImportGrid.mockRejectedValue(new ApiError(409, "CONFLICT", "x"));
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-row-k1");

      await user.click(screen.getByTestId("import-save"));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
    });

    it("loại này đang chạy nền không khóa loại kia (trạng thái theo từng loại)", async () => {
      grids.TEACHER = [row(9)];
      api.getImportStatus.mockImplementation(async (kind: string) =>
        kind === "STUDENT" ? { status: "PROCESSING", total: 5, processed: 2 } : { status: "NONE" },
      );
      renderView("TEACHER");

      await screen.findByTestId("import-row-k9");
      expect(screen.getByTestId("import-save")).toBeEnabled();
      expect(screen.queryByTestId("import-progress")).not.toBeInTheDocument();
    });
  });

  describe("file mẫu và điều hướng", () => {
    it("tải file mẫu đúng loại", async () => {
      api.downloadImportTemplate.mockResolvedValue({ blob: new Blob(["x"]), filename: "mau.xlsx" });
      URL.createObjectURL = vi.fn(() => "blob:x");
      URL.revokeObjectURL = vi.fn();
      const user = userEvent.setup();
      renderView("STUDENT");
      await screen.findByTestId("import-grid-title");

      await user.click(screen.getByTestId("import-template-student"));

      await waitFor(() => expect(api.downloadImportTemplate).toHaveBeenCalledWith("STUDENT"));
    });

    it("tải mẫu lỗi: báo bằng toast", async () => {
      api.downloadImportTemplate.mockRejectedValue(new Error("x"));
      const user = userEvent.setup();
      renderView();
      await screen.findByTestId("import-grid-title");

      await user.click(screen.getByTestId("import-template-student"));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Không tải được file mẫu."));
    });

    it("liên kết quay lại danh sách đúng tab", async () => {
      renderView("TEACHER");
      await screen.findByTestId("import-grid-title");

      expect(screen.getByRole("link", { name: "Quay lại danh sách tài khoản" })).toHaveAttribute(
        "href",
        "/admin/users/teachers",
      );
    });

    it("lỗi tải bảng: báo và cho thử lại", async () => {
      api.getImportGrid.mockRejectedValueOnce(new ApiError(500, "UNKNOWN", "x"));
      const user = userEvent.setup();
      renderView();

      expect(await screen.findByTestId("error-state")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Thử lại" }));
      expect(await screen.findByTestId("import-grid-title")).toBeInTheDocument();
    });
  });
});
