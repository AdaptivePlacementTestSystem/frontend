import { afterEach, describe, expect, it, vi } from "vitest";
import { getActiveSession, getResult, getReview, startSession } from "@/lib/api/endpoints";

afterEach(() => vi.unstubAllGlobals());

describe("session API contract", () => {
  it("maps the active session returned by the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            activeSessionId: "session-1",
            examRoundId: "round-1",
            startedAt: "2026-11-23T00:00:00Z",
            itemCount: 3,
            maxItems: 25,
            expiresAt: "2026-11-23T01:00:00Z",
            serverTime: "2026-11-23T00:20:00Z",
          }),
          { status: 200 },
        ),
      ),
    );
    expect((await getActiveSession()).session).toMatchObject({
      sessionId: "session-1",
      itemCount: 3,
    });
  });

  it("handles the backend's empty 200 response when there is no active session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    expect(await getActiveSession()).toEqual({ session: null });
  });

  it("sends the selected exam round in the start request", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionId: "s", expiresAt: "2026-11-23T01:00:00Z" }), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await startSession("round-1");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ examRoundId: "round-1" });
  });

  it("maps review responses and rejects invalid answer keys", async () => {
    const entry = {
      questionNumber: 1,
      itemId: "i",
      content: "Question",
      options: { A: "a", B: "b", C: "c", D: "d" },
      selectedAnswer: "B",
      correctAnswer: "A",
      isCorrect: false,
      skill: "GRAMMAR",
      cefrTarget: "A1",
      irtB: 0,
      explanation: null,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([entry]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...entry, selectedAnswer: "X" }]), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await getReview("s")).toMatchObject([{ order: 1, chosen: "B", correct: "A" }]);
    await expect(getReview("s")).rejects.toThrow("Dữ liệu xem lại bài thi không hợp lệ");
  });

  it("maps result fields without inventing missing ability or skill scores", async () => {
    const body = {
      sessionId: "s",
      status: "COMPLETED",
      thetaFinal: null,
      seFinal: null,
      cefrLevel: "A2",
      confidenceLevel: "LOW",
      boundaryEffect: false,
      confidenceInterval95: [],
      totalItems: 8,
      startedAt: "2026-11-23T00:00:00Z",
      completedAt: null,
      durationSeconds: 100,
      stoppingReason: null,
      skillProfiles: [{ skill: "GRAMMAR", itemsAdministered: 4, correctCount: 2 }],
      errorPatterns: [],
      aiRecommendations: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    );
    const result = await getResult("s");
    expect(result.ability).toEqual({ theta: null, standardError: null, ci95: null });
    expect(result.skillProfiles[0]?.scorePercent).toBeUndefined();
    expect(result.skillProfiles[0]?.cefrEstimate).toBeUndefined();
  });
});
