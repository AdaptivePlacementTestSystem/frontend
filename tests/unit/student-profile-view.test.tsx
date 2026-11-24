import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentProfileView } from "@/features/reports/student-profile-view";
import { ApiError } from "@/lib/api/errors";

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
      { skill: "VOCABULARY", theta: 0.5, standardError: 0.35, itemsAdministered: 13, correctCount: 9, accuracyRate: 0.69 },
      { skill: "GRAMMAR", theta: 0.3, standardError: 0.38, itemsAdministered: 12, correctCount: 7, accuracyRate: 0.58 },
    ],
    errorPatterns: [],
    aiRecommendations: [],
  },
  history: [
    {
      sessionId: "sess-1",
      completedAt: "2026-11-18T10:00:00.000Z",
      cefrLevel: "B1",
      theta: 0.42,
      standardError: 0.31,
      itemsAdministered: 25,
      status: "COMPLETED",
      examRoundName: "Kỳ thi Xếp lớp K2026",
    },
    {
      sessionId: "sess-0",
      completedAt: "2026-05-15T09:00:00.000Z",
      cefrLevel: "A2",
      theta: -0.35,
      standardError: 0.32,
      itemsAdministered: 21,
      status: "COMPLETED",
      examRoundName: "Khảo sát đầu vào",
    },
  ],
};

function renderView(studentId = "SV20260012") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudentProfileView studentId={studentId} />
    </QueryClientProvider>,
  );
}

describe("S14 - StudentProfileView Component", () => {
  beforeEach(() => {
    api.getStudentProfile.mockReset();
  });

  it("hiển thị đầy đủ thông tin sinh viên, thẻ CEFR và bảng lịch sử thi", async () => {
    api.getStudentProfile.mockResolvedValue(mockProfile);

    renderView();

    expect(await screen.findByTestId("student-profile-name")).toHaveTextContent("Nguyễn Minh Anh");
    expect(screen.getByText("SV20260012")).toBeInTheDocument();
    expect(screen.getByTestId("back-to-lookup")).toBeInTheDocument();
    expect(screen.getByTestId("history-table")).toBeInTheDocument();
    expect(screen.getByText("2 lần kiểm tra CAT")).toBeInTheDocument();
    expect(screen.getByText("Intermediate English B1")).toBeInTheDocument();
  });

  it("sinh viên chưa có bài thi nào (latest = null): hiển thị thông báo chưa có hồ sơ", async () => {
    api.getStudentProfile.mockResolvedValue({
      student: mockProfile.student,
      latest: null,
      history: [],
    });

    renderView();

    expect(await screen.findByTestId("no-profile-alert")).toBeVisible();
    expect(screen.getByText("Sinh viên chưa có hồ sơ năng lực.")).toBeInTheDocument();
  });

  it("không tìm thấy sinh viên (404): hiển thị cảnh báo lỗi và nút quay lại", async () => {
    api.getStudentProfile.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Không tìm thấy sinh viên"));

    renderView("SV_INVALID");

    expect(await screen.findByText(/Không tìm thấy sinh viên/i)).toBeInTheDocument();
    expect(screen.getByText("Quay lại tra cứu")).toBeInTheDocument();
  });

  it("lưu nhận xét học thuật của giảng viên hiển thị phản hồi đã lưu", async () => {
    api.getStudentProfile.mockResolvedValue(mockProfile);

    renderView();

    await screen.findByTestId("student-profile-name");
    const textarea = screen.getByPlaceholderText(/Nhập ghi chú sư phạm/i);
    fireEvent.change(textarea, { target: { value: "Sinh viên tiến bộ rõ rệt ở thì hoàn thành." } });

    const saveBtn = screen.getByText("Lưu nhận xét");
    fireEvent.click(saveBtn);

    expect(screen.getByText("Đã lưu thay đổi")).toBeInTheDocument();
  });
});
