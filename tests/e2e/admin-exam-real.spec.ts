import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.ADMIN_E2E_FIXTURE_DIR;
const localTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

test("Admin tạo kỳ, lưu roster, công bố, theo dõi và sửa lịch với API thật", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(!dir, "Cần fixture test được tạo riêng bằng create-admin-e2e-fixture.ts");
  const fixture = JSON.parse(readFileSync(join(dir!, "fixture.json"), "utf8")) as {
    token: string;
    code: string;
  };
  await context.addCookies([
    { name: "apt_token", value: fixture.token, url: baseURL!, httpOnly: true, sameSite: "Lax" },
  ]);
  page.on("dialog", (dialog) => dialog.accept());
  const name = `Kỳ E2E ${Date.now()}`;
  await page.goto("/admin/exam-rounds/new");
  await page.getByTestId("round-name").fill(name);
  await page.getByTestId("round-opens").fill(localTime(new Date(Date.now() + 7200000)));
  await page.getByTestId("round-closes").fill(localTime(new Date(Date.now() + 14400000)));
  await page.getByTestId("save-round").click();
  await expect(page).toHaveURL(/\/admin\/exam-rounds$/);
  await page.getByRole("link", { name }).click();
  await page.getByRole("link", { name: "Nhập danh sách thi" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải file mẫu" }).click();
  expect((await download).suggestedFilename()).toBe("danh-sach-thi.xlsx");
  await page.getByLabel("File Excel").setInputFiles(join(dir!, "roster.xlsx"));
  await page.getByRole("button", { name: "Tải lên" }).click();
  await expect(page.getByText(fixture.code, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lưu danh sách" }).click();
  await expect(page.getByText("Đã lưu 1 thí sinh vào kỳ thi.")).toBeVisible();
  await page.getByRole("link", { name: "← Chi tiết kỳ thi" }).click();
  await page.getByRole("button", { name: "Công bố" }).click();
  await expect(page.getByText("Đã lên lịch", { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.code, { exact: true })).toBeVisible();
  const detailUrl = page.url();
  const roundId = detailUrl.split("/").pop()!;
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("option", { name })).toBeAttached();
  const filtered = page.waitForResponse(
    (response) =>
      response.url().includes(`/reports/overview?examRoundId=${roundId}`) &&
      response.status() === 200,
  );
  await page.getByTestId("round-filter").selectOption(roundId);
  await filtered;
  await page.goto(detailUrl);
  await page.getByRole("link", { name: "Sửa kỳ thi" }).click();
  await page.getByLabel("Thời gian đóng").fill(localTime(new Date(Date.now() + 18000000)));
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/exam-rounds\/[0-9a-f-]+$/);
});
