import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("Admin tải mẫu, nhập câu và thử lại sau mất kết nối khi lưu", async ({
  page,
  context,
  baseURL,
}) => {
  const dir = process.env.ADMIN_E2E_FIXTURE_DIR;
  test.skip(!dir, "Cần fixture test riêng");
  const fixture = JSON.parse(readFileSync(join(dir!, "fixture.json"), "utf8")) as { token: string };
  await context.addCookies([
    { name: "apt_token", value: fixture.token, url: baseURL!, httpOnly: true, sameSite: "Lax" },
  ]);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/item-batches/import");
  await expect(page.getByLabel("Chọn tệp .xlsx")).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải mẫu Excel" }).click();
  expect((await download).suggestedFilename()).toBe("question-import-template.xlsx");
  await page.getByLabel("Chọn tệp .xlsx").setInputFiles(join(dir!, "questions.xlsx"));
  await expect(page.getByText("Which word is a greeting?")).toBeVisible();
  let first = true;
  await page.route("**/api/proxy/item-batches/import/save", async (route) => {
    if (!first) {
      await route.continue();
      return;
    }
    first = false;
    await route.fetch();
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Lưu lô" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Which word is a greeting?")).toBeVisible();
  await page.getByRole("button", { name: "Lưu lô" }).click();
  await expect(page).toHaveURL(/\/admin\/item-batches\/[0-9a-f-]+$/);
});
