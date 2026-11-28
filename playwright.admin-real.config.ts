import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.ADMIN_E2E_BASE_URL ?? "http://127.0.0.1:3092";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname))
  throw new Error("Chỉ chạy E2E trên máy local");
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "admin-exam-real.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    ...(process.env.ADMIN_E2E_BROWSER_PATH
      ? { launchOptions: { executablePath: process.env.ADMIN_E2E_BROWSER_PATH } }
      : {}),
  },
});
