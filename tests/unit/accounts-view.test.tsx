import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountsView } from "@/features/admin-users/accounts-view";
import { ApiError } from "@/lib/api/errors";
import type { AccountKind, AccountPage, AdminAccount } from "@/lib/api/types";
import { seedAccounts } from "@/mocks/admin-handlers";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  lockAccount: vi.fn(),
  unlockAccount: vi.fn(),
  resendTemporaryPassword: vi.fn(),
  changeAccountRole: vi.fn(),
  downloadImportTemplate: vi.fn(),
}));
vi.mock("@/lib/api/endpoints", () => api);
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const ME = "u-ad1"; // Admin đang đăng nhập
const ADMIN_TEMPLATE = seedAccounts().find((a) => a.id === "u-ad1")!;
const STUDENT_TEMPLATE = seedAccounts().find((a) => a.id === "u-sv1")!;

const pageOf = (kind: AccountKind, rows = seedAccounts()): AccountPage => {
  const items = rows.filter((a) =>
    kind === "STUDENT" ? a.role === "STUDENT" : a.role !== "STUDENT",
  );
  return { items, total: items.length, page: 1, pageSize: 20 };
};

function renderView(kind: AccountKind = "STUDENT") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountsView kind={kind} currentUserId={ME} />
    </QueryClientProvider>,
  );
}

const row = (id: string) => screen.findByTestId(`account-row-${id}`);

describe("AccountsView (S24)", () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    api.listAccounts.mockImplementation(async (kind: AccountKind) => pageOf(kind));
    for (const fn of [api.lockAccount, api.unlockAccount, api.resendTemporaryPassword]) {
      fn.mockResolvedValue({});
    }
    api.changeAccountRole.mockResolvedValue({});
    api.createAccount.mockResolvedValue({});
    api.updateAccount.mockResolvedValue({});
  });

  describe("file mẫu import", () => {
    it("tab Sinh viên: nút tải file mẫu gọi đúng loại và lưu file", async () => {
      const click = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
      URL.createObjectURL = vi.fn(() => "blob:x");
      URL.revokeObjectURL = vi.fn();
      api.downloadImportTemplate.mockResolvedValue({
        blob: new Blob(["x"]),
        filename: "mau-sinh-vien.xlsx",
      });
      const user = userEvent.setup();
      renderView("STUDENT");

      await user.click(await screen.findByTestId("download-template"));

      await waitFor(() => expect(api.downloadImportTemplate).toHaveBeenCalledWith("STUDENT"));
      expect(click).toHaveBeenCalled();
    });

    it("tab Giảng viên: tải file mẫu giảng viên; lỗi thì báo cho người dùng", async () => {
      api.downloadImportTemplate.mockRejectedValue(new ApiError(500, "UNKNOWN", "x"));
      const user = userEvent.setup();
      renderView("TEACHER");

      await user.click(await screen.findByTestId("download-template"));

      await waitFor(() => expect(api.downloadImportTemplate).toHaveBeenCalledWith("TEACHER"));
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
    });
  });

  describe("danh sách", () => {
    it("tab Sinh viên: cột MSSV, trạng thái và 'Đã đổi mật khẩu' theo từng dòng", async () => {
      renderView("STUDENT");

      const an = await row("u-sv1");
      expect(an).toHaveTextContent("SV2026001");
      expect(an).toHaveTextContent("Hoạt động");
      expect(an).toHaveTextContent("Rồi");
      expect(await row("u-sv2")).toHaveTextContent("Chưa");
      expect(await row("u-lock")).toHaveTextContent("Đã khóa");
      expect(screen.getByRole("columnheader", { name: "MSSV" })).toBeInTheDocument();
      expect(screen.queryByTestId("account-row-u-gv1")).not.toBeInTheDocument();
    });

    it("tab Giảng viên: cột Mã GV, Admin nằm trong danh sách kèm huy hiệu", async () => {
      renderView("TEACHER");

      expect(await row("u-gv1")).toHaveTextContent("GV001");
      expect(await row("u-ad1")).toHaveTextContent("Admin");
      expect(screen.getByRole("columnheader", { name: "Mã GV" })).toBeInTheDocument();
    });

    it("hai tab là hai liên kết route, tab hiện tại được đánh dấu", async () => {
      renderView("TEACHER");
      await row("u-gv1");

      expect(screen.getByTestId("accounts-tab-students")).toHaveAttribute(
        "href",
        "/admin/users/students",
      );
      expect(screen.getByTestId("accounts-tab-teachers")).toHaveAttribute(
        "href",
        "/admin/users/teachers",
      );
      expect(screen.getByTestId("accounts-tab-teachers")).toHaveAttribute("aria-current", "page");
      expect(screen.getByTestId("accounts-tab-students")).not.toHaveAttribute("aria-current");
    });

    it("nút Import chuyển sang S19 với loại đang chọn", async () => {
      renderView("TEACHER");
      await row("u-gv1");

      expect(screen.getByTestId("import-accounts")).toHaveAttribute(
        "href",
        "/admin/users/import?kind=TEACHER",
      );
    });

    it("danh sách rỗng: báo 'Chưa có sinh viên.'", async () => {
      api.listAccounts.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
      renderView("STUDENT");

      expect(await screen.findByText("Chưa có sinh viên.")).toBeInTheDocument();
    });

    it("lỗi tải: hiện thông báo và cho thử lại", async () => {
      api.listAccounts.mockRejectedValueOnce(new ApiError(500, "UNKNOWN", "x"));
      const user = userEvent.setup();
      renderView();

      expect(await screen.findByTestId("error-state")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Thử lại" }));
      expect(await row("u-sv1")).toBeInTheDocument();
    });
  });

  describe("tìm kiếm và phân trang", () => {
    it("gõ từ khóa gọi lại API với q (đã chờ gõ xong) và về trang 1", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.type(screen.getByTestId("account-search"), "SV2026001");

      await waitFor(() =>
        expect(api.listAccounts).toHaveBeenLastCalledWith(
          "STUDENT",
          { q: "SV2026001", page: 1, pageSize: 20 },
          expect.anything(),
        ),
      );
    });

    it("không có kết quả khớp: báo riêng cho trường hợp tìm kiếm", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");
      api.listAccounts.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      await user.type(screen.getByTestId("account-search"), "khongco");

      expect(await screen.findByText("Không có tài khoản nào khớp.")).toBeInTheDocument();
    });

    it("phân trang: hiện 'Hiển thị a–b trong N' và gọi trang kế", async () => {
      const many: AdminAccount[] = Array.from({ length: 20 }, (_, i) => ({
        ...STUDENT_TEMPLATE,
        id: `s-${i}`,
        email: `s${i}@e.test`,
      }));
      api.listAccounts.mockImplementation(async (_k: AccountKind, q: { page: number }) => ({
        items: many,
        total: 45,
        page: q.page,
        pageSize: 20,
      }));
      const user = userEvent.setup();
      renderView();

      expect(await screen.findByTestId("accounts-page-info")).toHaveTextContent(
        "Hiển thị 1–20 trong 45",
      );
      expect(screen.getByTestId("accounts-prev")).toBeDisabled();

      await user.click(screen.getByTestId("accounts-next"));

      await waitFor(() =>
        expect(screen.getByTestId("accounts-page-info")).toHaveTextContent(
          "Hiển thị 21–40 trong 45",
        ),
      );
      expect(api.listAccounts).toHaveBeenLastCalledWith(
        "STUDENT",
        { q: undefined, page: 2, pageSize: 20 },
        expect.anything(),
      );
    });
  });

  describe("tạo và sửa", () => {
    it("tạo sinh viên: gửi MSSV, họ tên, email rồi báo thành công", async () => {
      const user = userEvent.setup();
      renderView("STUDENT");
      await row("u-sv1");

      await user.click(screen.getByTestId("add-student"));
      await user.type(screen.getByTestId("account-code"), "SV100");
      await user.type(screen.getByTestId("account-name"), "Phạm Thị D");
      await user.type(screen.getByTestId("account-email"), "d@e.test");
      await user.click(screen.getByTestId("account-save"));

      await waitFor(() =>
        expect(api.createAccount).toHaveBeenCalledWith("STUDENT", {
          studentCode: "SV100",
          fullName: "Phạm Thị D",
          email: "d@e.test",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Đã tạo tài khoản. Mật khẩu tạm đã được gửi qua email.",
      );
      await waitFor(() => expect(screen.queryByTestId("account-form")).not.toBeInTheDocument());
    });

    it("tạo giảng viên: gửi teacherCode", async () => {
      const user = userEvent.setup();
      renderView("TEACHER");
      await row("u-gv1");

      await user.click(screen.getByTestId("add-teacher"));
      await user.type(screen.getByTestId("account-code"), "GV777");
      await user.type(screen.getByTestId("account-name"), "Võ Văn E");
      await user.type(screen.getByTestId("account-email"), "e@e.test");
      await user.click(screen.getByTestId("account-save"));

      await waitFor(() =>
        expect(api.createAccount).toHaveBeenCalledWith("TEACHER", {
          teacherCode: "GV777",
          fullName: "Võ Văn E",
          email: "e@e.test",
        }),
      );
    });

    it("thiếu trường và email sai định dạng: báo lỗi tại ô, không gọi API", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("add-student"));
      await user.type(screen.getByTestId("account-email"), "khong-phai-email");
      await user.click(screen.getByTestId("account-save"));

      expect(await screen.findByTestId("error-code")).toHaveTextContent("Trường này là bắt buộc");
      expect(screen.getByTestId("error-name")).toBeInTheDocument();
      expect(screen.getByTestId("error-email")).toHaveTextContent("Email không đúng định dạng");
      expect(api.createAccount).not.toHaveBeenCalled();
    });

    it.each([
      ["email", "error-email", "Email đã tồn tại."],
      ["studentCode", "error-code", "MSSV đã tồn tại."],
    ])(
      "trùng %s: báo lỗi ngay dưới đúng ô và giữ nguyên hộp thoại",
      async (field, testId, message) => {
        api.createAccount.mockRejectedValue(new ApiError(409, "CONFLICT", "x", { field }));
        const user = userEvent.setup();
        renderView();
        await row("u-sv1");

        await user.click(screen.getByTestId("add-student"));
        await user.type(screen.getByTestId("account-code"), "SV1");
        await user.type(screen.getByTestId("account-name"), "A");
        await user.type(screen.getByTestId("account-email"), "a@e.test");
        await user.click(screen.getByTestId("account-save"));

        expect(await screen.findByTestId(testId)).toHaveTextContent(message);
        expect(screen.getByTestId("account-form")).toBeInTheDocument();
        expect(toast.success).not.toHaveBeenCalled();
      },
    );

    it("trùng mã GV: báo 'Mã GV đã tồn tại.'", async () => {
      api.createAccount.mockRejectedValue(
        new ApiError(409, "CONFLICT", "x", { field: "teacherCode" }),
      );
      const user = userEvent.setup();
      renderView("TEACHER");
      await row("u-gv1");

      await user.click(screen.getByTestId("add-teacher"));
      await user.type(screen.getByTestId("account-code"), "GV001");
      await user.type(screen.getByTestId("account-name"), "B");
      await user.type(screen.getByTestId("account-email"), "b@e.test");
      await user.click(screen.getByTestId("account-save"));

      expect(await screen.findByTestId("error-code")).toHaveTextContent("Mã GV đã tồn tại.");
    });

    it("lỗi khác (mất mạng): báo chung trong hộp thoại, không đóng", async () => {
      api.createAccount.mockRejectedValue(new ApiError(0, "NETWORK", "x"));
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("add-student"));
      await user.type(screen.getByTestId("account-code"), "SV1");
      await user.type(screen.getByTestId("account-name"), "A");
      await user.type(screen.getByTestId("account-email"), "a@e.test");
      await user.click(screen.getByTestId("account-save"));

      expect(await screen.findByTestId("form-error")).toHaveTextContent(
        "Không kết nối được máy chủ",
      );
    });

    it("sửa: điền sẵn dữ liệu, MSSV chỉ đọc, chỉ gửi họ tên và email", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("edit-u-sv1"));

      expect(screen.getByTestId("account-code")).toHaveValue("SV2026001");
      expect(screen.getByTestId("account-code")).toBeDisabled();
      expect(screen.getByTestId("account-name")).toHaveValue("Nguyễn Văn An (mock)");

      await user.clear(screen.getByTestId("account-name"));
      await user.type(screen.getByTestId("account-name"), "Tên mới");
      await user.click(screen.getByTestId("account-save"));

      await waitFor(() =>
        expect(api.updateAccount).toHaveBeenCalledWith("STUDENT", "u-sv1", {
          fullName: "Tên mới",
          email: "sv001@example.test",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Đã cập nhật tài khoản.");
    });

    it("mở lại hộp thoại tạo sau khi sửa: biểu mẫu trống, MSSV nhập được", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("edit-u-sv1"));
      await user.click(screen.getByRole("button", { name: "Hủy" }));
      await user.click(screen.getByTestId("add-student"));

      expect(screen.getByTestId("account-code")).toHaveValue("");
      expect(screen.getByTestId("account-code")).toBeEnabled();
    });
  });

  describe("khóa, mở khóa, gửi lại mật khẩu", () => {
    it("Khóa cần xác nhận rồi mới gọi API", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("lock-u-sv1"));
      expect(api.lockAccount).not.toHaveBeenCalled();
      expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("Khóa tài khoản này?");
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() => expect(api.lockAccount).toHaveBeenCalledWith("u-sv1"));
      expect(toast.success).toHaveBeenCalledWith("Đã khóa tài khoản.");
    });

    it("hủy xác nhận: không gọi API", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("lock-u-sv1"));
      await user.click(
        within(screen.getByTestId("confirm-dialog")).getByRole("button", { name: "Hủy" }),
      );

      expect(api.lockAccount).not.toHaveBeenCalled();
    });

    it("tài khoản đang bị khóa: nút thành 'Mở khóa' và mở ngay không cần xác nhận", async () => {
      const user = userEvent.setup();
      renderView();
      const locked = await row("u-lock");

      const button = within(locked).getByTestId("lock-u-lock");
      expect(button).toHaveTextContent("Mở khóa");
      await user.click(button);

      await waitFor(() => expect(api.unlockAccount).toHaveBeenCalledWith("u-lock"));
      expect(toast.success).toHaveBeenCalledWith("Đã mở khóa tài khoản.");
    });

    it("Gửi lại mật khẩu tạm: xác nhận rồi gọi API", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("resend-temp-u-sv1"));
      expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("Gửi lại mật khẩu tạm?");
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() => expect(api.resendTemporaryPassword).toHaveBeenCalledWith("u-sv1"));
      expect(toast.success).toHaveBeenCalledWith("Đã đặt lại mật khẩu tạm và gửi qua email.");
    });

    it("lỗi từ máy chủ khi khóa: báo bằng toast, hộp xác nhận vẫn mở để thử lại", async () => {
      api.lockAccount.mockRejectedValue(new ApiError(403, "FORBIDDEN", "x"));
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");

      await user.click(screen.getByTestId("lock-u-sv1"));
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Bạn không có quyền thực hiện thao tác này.",
          expect.anything(),
        ),
      );
    });

    it("sau thao tác danh sách được tải lại", async () => {
      const user = userEvent.setup();
      renderView();
      await row("u-sv1");
      const before = api.listAccounts.mock.calls.length;

      await user.click(screen.getByTestId("lock-u-sv1"));
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() => expect(api.listAccounts.mock.calls.length).toBeGreaterThan(before));
    });
  });

  describe("quy tắc theo từng dòng (BR-17/18/19)", () => {
    it("Admin đang đăng nhập: không tự khóa, không tự thu hồi quyền", async () => {
      renderView("TEACHER");
      await row("u-ad1");

      expect(screen.getByTestId("lock-u-ad1")).toBeDisabled();
      expect(screen.getByTestId("lock-u-ad1")).toHaveAttribute(
        "title",
        "Bạn không thể thực hiện thao tác này với chính mình.",
      );
      expect(screen.getByTestId("grant-admin-u-ad1")).toBeDisabled();
      expect(screen.getByTestId("grant-admin-u-ad1")).toHaveTextContent("Thu hồi Admin");
    });

    it("Admin khác: không khóa được (phải thu hồi quyền trước) và không gửi lại mật khẩu", async () => {
      const accounts = seedAccounts();
      accounts.push({
        ...ADMIN_TEMPLATE,
        id: "u-ad2",
        email: "ad2@e.test",
        fullName: "Admin hai",
      });
      api.listAccounts.mockImplementation(async (kind: AccountKind) => pageOf(kind, accounts));
      renderView("TEACHER");
      await row("u-ad2");

      expect(screen.getByTestId("lock-u-ad2")).toBeDisabled();
      expect(screen.getByTestId("lock-u-ad2")).toHaveAttribute(
        "title",
        "Muốn khóa Admin, hãy thu hồi quyền Admin trước.",
      );
      expect(screen.getByTestId("resend-temp-u-ad2")).toBeDisabled();
      // thu hồi quyền người khác thì được
      expect(screen.getByTestId("grant-admin-u-ad2")).toBeEnabled();
    });

    it("giảng viên thường: Nâng lên Admin (xác nhận) gọi đổi role ADMIN", async () => {
      const user = userEvent.setup();
      renderView("TEACHER");
      await row("u-gv1");

      expect(screen.getByTestId("grant-admin-u-gv1")).toHaveTextContent("Nâng lên Admin");
      await user.click(screen.getByTestId("grant-admin-u-gv1"));
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() => expect(api.changeAccountRole).toHaveBeenCalledWith("u-gv1", "ADMIN"));
      expect(toast.success).toHaveBeenCalledWith("Đã nâng lên Admin.");
    });

    it("thu hồi quyền Admin khác gọi đổi role TEACHER", async () => {
      const accounts = seedAccounts();
      accounts.push({ ...ADMIN_TEMPLATE, id: "u-ad2", email: "ad2@e.test", fullName: "Admin hai" });
      api.listAccounts.mockImplementation(async (kind: AccountKind) => pageOf(kind, accounts));
      const user = userEvent.setup();
      renderView("TEACHER");
      await row("u-ad2");

      await user.click(screen.getByTestId("grant-admin-u-ad2"));
      expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("Thu hồi quyền Admin?");
      await user.click(screen.getByTestId("confirm-yes"));

      await waitFor(() => expect(api.changeAccountRole).toHaveBeenCalledWith("u-ad2", "TEACHER"));
    });

    it("tab Sinh viên không có nút Nâng/Thu hồi Admin", async () => {
      renderView("STUDENT");
      await row("u-sv1");

      expect(screen.queryByTestId("grant-admin-u-sv1")).not.toBeInTheDocument();
    });
  });
});
