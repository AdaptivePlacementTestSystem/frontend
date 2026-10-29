import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  // Backend giả giữ trạng thái trong bộ nhớ ⇒ chạy tuần tự để các kịch bản không giẫm lên nhau
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      API_BASE_URL: process.env.API_BASE_URL ?? "http://localhost:3001/api/v1",
      MOCK_API: "1",
      MOCK_MAX_ITEMS: "4",
    },
  },
});
