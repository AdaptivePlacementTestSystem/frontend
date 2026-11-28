import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentLookup } from "@/features/reports/student-lookup";
import { ApiError } from "@/lib/api/errors";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const api = vi.hoisted(() => ({
  getStudentProfile: vi.fn(),
}));
vi.mock("@/lib/api/endpoints", () => api);

const mockProfile = {
  student: {
    studentCode: "SV20260012",
    fullName: "Nguyễn Minh Anh",
    email: "minhanh.nguyen@truong.edu.vn",
  },
  latest: {
    sessionId: "sess-1",
    completedAt: "2026-11-18T10:00:00.000Z",
    cefrLevel: "B1",
    cefrConfidence: "HIGH",
    ability: {
      theta: 0.42,
      standardError: 0.31,
      confidenceInterval95: [-0.19, 1.03],
    },
    meta: {
      stoppingReason: "SE_THRESHOLD",
      totalItems: 25,
    },
    skillProfiles: [
      {
        skill: "VOCABULARY",
        theta: 0.5,
        standardError: 0.35,
        itemsAdministered: 13,
        correctCount: 9,
        accuracyRate: 0.69,
      },
      {
        skill: "GRAMMAR",
        theta: 0.3,
        standardError: 0.38,
        itemsAdministered: 12,
        correctCount: 7,
        accuracyRate: 0.58,
      },
    ],
    errorPatterns: [],
    aiRecommendations: [],
  },
  history: [],
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudentLookup />
    </QueryClientProvider>,
  );
}

describe("S13 - StudentLookup Component", () => {
  beforeEach(() => {
    api.getStudentProfile.mockReset();
    pushMock.mockReset();
  });

  it("hiển thị thẻ tra cứu căn giữa ≤ 560px với ô nhập MSSV và nút tìm", () => {
    renderView();

    expect(screen.getByTestId("student-code-input")).toBeInTheDocument();
    expect(screen.getByTestId("student-search")).toBeInTheDocument();
  });

  it("báo lỗi nếu submit khi ô MSSV để trống", async () => {
    renderView();

    const searchBtn = screen.getByTestId("student-search");
    fireEvent.click(searchBtn);

    expect(screen.getByText("Vui lòng nhập mã số sinh viên.")).toBeInTheDocument();
    expect(api.getStudentProfile).not.toHaveBeenCalled();
  });

  it("tra cứu không tìm thấy sinh viên (404/403) hiển thị cảnh báo không tìm thấy", async () => {
    api.getStudentProfile.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Không tìm thấy"));

    renderView();

    const input = screen.getByTestId("student-code-input");
    fireEvent.change(input, { target: { value: "SV999999" } });

    const searchBtn = screen.getByTestId("student-search");
    fireEvent.click(searchBtn);

    expect(await screen.findByTestId("student-not-found")).toBeVisible();
  });

  it("tra cứu thành công: hiển thị tên sinh viên và nút chuyển sang S14", async () => {
    api.getStudentProfile.mockResolvedValue(mockProfile);

    renderView();

    const input = screen.getByTestId("student-code-input");
    fireEvent.change(input, { target: { value: "SV20260012" } });

    const searchBtn = screen.getByTestId("student-search");
    fireEvent.click(searchBtn);

    expect(await screen.findByTestId("student-name")).toHaveTextContent("Nguyễn Minh Anh");
    expect(screen.getByText("MSSV: SV20260012")).toBeInTheDocument();

    const detailBtn = screen.getByText(/Xem chi tiết hồ sơ/i);
    fireEvent.click(detailBtn);
    expect(pushMock).toHaveBeenCalledWith("/teacher/students/SV20260012");
  });
});
