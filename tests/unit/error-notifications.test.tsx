import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";
import { LoginForm } from "@/features/auth/login-form";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/error-message";
import { notifyError } from "@/lib/api/notify-error";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast, Toaster: () => null }));
const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
const bff = vi.hoisted(() => ({ bffRequest: vi.fn() }));
vi.mock("@/lib/api/client", async (orig) => ({
  ...(await orig<object>()),
  bffRequest: bff.bffRequest,
}));

beforeEach(() => {
  toast.success.mockReset();
  toast.error.mockReset();
  nav.replace.mockReset();
  bff.bffRequest.mockReset();
});

describe("ApiError.retryAfterSeconds", () => {
  it("đọc số giây từ thông điệp của backend", () => {
    const e = new ApiError(
      429,
      "RATE_LIMITED",
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau 60 giây.",
    );
    expect(e.retryAfterSeconds).toBe(60);
  });

  it("ưu tiên trường retryAfterSeconds do BFF gửi, làm tròn lên", () => {
    const e = new ApiError(429, "RATE_LIMITED", "x", { retryAfterSeconds: 12.2 });
    expect(e.retryAfterSeconds).toBe(13);
  });

  it("không có thông tin thì undefined", () => {
    expect(
      new ApiError(429, "RATE_LIMITED", "Quá nhiều yêu cầu.").retryAfterSeconds,
    ).toBeUndefined();
  });
});

describe("errorMessage: quá giới hạn", () => {
  it("nêu rõ số giây phải chờ", () => {
    const e = new ApiError(
      429,
      "RATE_LIMITED",
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau 45 giây.",
    );
    expect(errorMessage(e)).toBe("Bạn thao tác quá nhanh. Vui lòng thử lại sau 45 giây.");
  });

  it("không biết số giây thì dùng câu chung (vẫn báo cho người dùng)", () => {
    expect(errorMessage(new ApiError(429, "RATE_LIMITED", "Quá nhiều yêu cầu."))).toBe(
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    );
  });

  it("các mã lỗi khác vẫn dùng bảng thông điệp", () => {
    expect(errorMessage(new ApiError(403, "FORBIDDEN", "x"))).toBe(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    expect(errorMessage(new Error("lạ"))).toBe("Đã có lỗi xảy ra. Vui lòng thử lại.");
  });
});

describe("notifyError", () => {
  it("hiện toast với nội dung lỗi, dùng nội dung làm id để không chồng thông báo trùng", () => {
    const message = notifyError(
      new ApiError(429, "RATE_LIMITED", "quá nhanh, thử lại sau 30 giây"),
    );

    expect(message).toBe("Bạn thao tác quá nhanh. Vui lòng thử lại sau 30 giây.");
    expect(toast.error).toHaveBeenCalledWith(message, { id: message });
  });
});

describe("Providers: lỗi tải dữ liệu luôn được báo", () => {
  it("query lỗi ⇒ toast, kể cả khi trang không tự hiện lỗi", async () => {
    function Probe() {
      useQuery({
        queryKey: ["probe"],
        queryFn: async () => {
          throw new ApiError(429, "RATE_LIMITED", "Vui lòng thử lại sau 20 giây.");
        },
        retry: false,
      });
      return <p>probe</p>;
    }

    render(
      <Providers>
        <Probe />
      </Providers>,
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau 20 giây.",
        expect.anything(),
      ),
    );
  });
});

describe("Form đăng nhập: không khóa nút và luôn báo lỗi", () => {
  const renderLogin = () => {
    const client = new QueryClient();
    return render(
      <QueryClientProvider client={client}>
        <LoginForm />
      </QueryClientProvider>,
    );
  };

  it("nút Đăng nhập bấm được ngay cả khi để trống", () => {
    renderLogin();
    expect(screen.getByTestId("login-submit")).toBeEnabled();
  });

  it("để trống rồi bấm: báo bằng toast và hiện lỗi từng ô, không gọi API", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Vui lòng nhập đầy đủ email và mật khẩu.",
        expect.anything(),
      ),
    );
    expect(screen.getAllByText("Trường này là bắt buộc").length).toBeGreaterThan(0);
    expect(bff.bffRequest).not.toHaveBeenCalled();
  });

  it("sai mật khẩu: hiện lỗi trong form và toast, nút vẫn bấm được để thử lại", async () => {
    bff.bffRequest.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "x"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "a@e.com");
    await user.type(
      document.querySelector('input[type="password"]') as HTMLInputElement,
      "Sai#Pass1",
    );
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(await screen.findByText("Thông tin đăng nhập không chính xác.")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeEnabled();
  });

  it("bị giới hạn tần suất (429): thông báo nêu số giây phải chờ ở cả toast và trong form", async () => {
    bff.bffRequest.mockRejectedValue(
      new ApiError(429, "RATE_LIMITED", "Bạn thao tác quá nhanh. Vui lòng thử lại sau 60 giây.", {
        retryAfterSeconds: 60,
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "a@e.com");
    await user.type(
      document.querySelector('input[type="password"]') as HTMLInputElement,
      "Sai#Pass1",
    );
    await user.click(screen.getByTestId("login-submit"));

    const text = "Bạn thao tác quá nhanh. Vui lòng thử lại sau 60 giây.";
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(text, { id: text }));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
});
