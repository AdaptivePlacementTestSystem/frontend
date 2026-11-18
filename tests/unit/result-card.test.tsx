import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultCard } from "@/features/result/result-card";
import type { SessionResult } from "@/lib/api/types";

describe("S05 - ResultCard Component", () => {
  const mockResult: SessionResult = {
    sessionId: "sess-123",
    completedAt: "2026-11-11T09:30:00Z",
    cefrLevel: "B1",
    cefrConfidence: "HIGH",
    boundaryEffect: false,
    ability: {
      theta: 0.28,
      standardError: 0.31,
      ci95: [-0.33, 0.89],
    },
    skillProfiles: [
      {
        skill: "VOCABULARY",
        itemsAdministered: 13,
        correctCount: 9,
      },
      {
        skill: "GRAMMAR",
        itemsAdministered: 12,
        correctCount: 7,
      },
    ],
    errorPatterns: [
      {
        topicTag: "Past Tenses & Conditionals",
        skill: "GRAMMAR",
        itemsAttempted: 5,
        correctCount: 2,
        accuracyRate: 0.4,
        severity: "HIGH",
      },
    ],
    aiRecommendations: [
      "Ưu tiên ôn tập thì quá khứ và mệnh đề điều kiện.",
      "Mở rộng vốn từ vựng học thuật B1.",
    ],
    meta: {
      itemsAdministered: 25,
      durationSeconds: 1800,
      stoppingReason: "SE_THRESHOLD",
    },
  };

  it("hiển thị huy hiệu CEFR B1 và thông tin độ tin cậy", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByTestId("cefr-level")).toHaveTextContent("B1");
    expect(screen.getByTestId("cefr-badge")).toHaveTextContent("Độ tin cậy: Cao");
  });

  it("hiển thị các chỉ số Rasch θ, SE và khoảng tin cậy 95%", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByTestId("theta-value")).toHaveTextContent("+0.28");
    expect(screen.getByTestId("se-value")).toHaveTextContent("0.31");
    expect(screen.getByTestId("ci-value")).toHaveTextContent("[-0.33 ; 0.89]");
  });

  it("tuân thủ Phương án 1 (Q-D): hiển thị số câu đúng/tổng số câu theo kỹ năng, không có thanh % hay badge CEFR riêng", () => {
    render(<ResultCard result={mockResult} />);
    const vocab = screen.getByTestId("skill-vocab");
    const grammar = screen.getByTestId("skill-grammar");

    expect(vocab).toHaveTextContent("9/13 câu");
    expect(grammar).toHaveTextContent("7/12 câu");

    // Tuyệt đối không hiển thị thanh progress bar % hay badge CEFR theo kỹ năng
    expect(vocab.querySelector('[role="progressbar"]')).toBeNull();
    expect(grammar.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("hiển thị cảnh báo hiệu ứng biên nếu boundaryEffect = true", () => {
    const boundaryResult = { ...mockResult, boundaryEffect: true, cefrLevel: "C1_PLUS" as const };
    render(<ResultCard result={boundaryResult} />);
    expect(screen.getByTestId("boundary-effect-warning")).toBeInTheDocument();
  });

  it("hiển thị danh sách chủ đề cần cải thiện và gợi ý AI", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByTestId("error-patterns")).toHaveTextContent("Past Tenses & Conditionals");
    expect(screen.getByTestId("recommendations")).toHaveTextContent("Ưu tiên ôn tập thì quá khứ");
  });

  it("không crash và hiển thị chính xác khi nhận dữ liệu phẳng từ backend chưa qua normalize", () => {
    const rawBackendResult = {
      sessionId: "raw-sess-1",
      status: "COMPLETED",
      thetaFinal: 0.45,
      seFinal: 0.33,
      cefrLevel: "B2",
      confidenceLevel: "HIGH",
      boundaryEffect: false,
      confidenceInterval95: [-0.2, 1.1],
      totalItems: 20,
      startedAt: "2026-11-11T09:00:00Z",
      completedAt: "2026-11-11T09:30:00Z",
      durationSeconds: 1800,
      stoppingReason: "SE_REACHED",
      skillProfiles: [],
      errorPatterns: [],
      aiRecommendations: [],
    } as unknown as SessionResult;

    render(<ResultCard result={rawBackendResult} />);
    expect(screen.getByTestId("cefr-level")).toHaveTextContent("B2");
    expect(screen.getByTestId("theta-value")).toHaveTextContent("+0.45");
  });
});
