import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewQueue } from "@/features/items/review-queue";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest: request }));

describe("hộp việc giáo viên", () => {
  it("hiển thị câu của B và gửi quyết định xác nhận", async () => {
    request.mockImplementation((_: string, options?: { method?: string }) =>
      options?.method === "POST"
        ? Promise.resolve({})
        : Promise.resolve([
            {
              id: "item",
              batchId: "batch",
              batchName: "Lô B1",
              role: "B",
              content: "Câu cần xác nhận",
              options: { A: "Một", B: "Hai", C: "Ba", D: "Bốn" },
              correctAnswer: "A",
              explanation: "Giải thích",
              flags: [],
              firstReview: {},
              secondReview: {},
            },
          ]),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ReviewQueue />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Câu cần xác nhận")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa câu hỏi" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/teacher-review/item/decision", {
        method: "POST",
        body: { action: "CONFIRM" },
      }),
    );
  });
});
