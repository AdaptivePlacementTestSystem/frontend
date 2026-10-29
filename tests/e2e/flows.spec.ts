import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

async function login(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Email hoặc MSSV").fill(identifier);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("user-name")).toBeVisible(); // đã vào trang đích, tránh đua với chuyển hướng
}

test.describe("đăng nhập và phân quyền", () => {
  test("chưa đăng nhập ⇒ chuyển về /login", async ({ page }) => {
    await page.goto("/teacher/items");
    await expect(page).toHaveURL(/\/login/);
  });

  test("sai mật khẩu hiện lỗi, không lộ ô nào sai", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email hoặc MSSV").fill("sv001@example.test");
    await page.getByLabel("Mật khẩu").fill("sai-mat-khau");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toContainText("không chính xác");
  });

  test("sinh viên vào khu giảng viên ⇒ 403", async ({ page }) => {
    await login(page, "sv001@example.test");
    await expect(page.getByTestId("user-name")).toBeVisible();
    await page.goto("/teacher/items");
    await expect(page.getByTestId("forbidden")).toBeVisible();
  });
});

test("sinh viên: làm bài đến khi có kết quả rồi xem lại đáp án", async ({ page }) => {
  await login(page, "sv002@example.test");
  await page.getByTestId("start-exam").click();
  await expect(page).toHaveURL(/\/exam\//);
  // Khi thi không có thanh điều hướng
  await expect(page.getByTestId("logout")).toHaveCount(0);

  for (let i = 0; i < 30; i++) {
    if (/\/results\//.test(page.url())) break;
    const submit = page.getByTestId("submit-answer");
    await expect(submit.or(page.getByTestId("cefr-level"))).toBeVisible();
    if (!(await submit.isVisible())) break;
    const before = await page.getByTestId("question-content").textContent();
    if (i === 0) await expect(submit).toBeDisabled(); // chưa chọn đáp án thì không nộp được
    await page.getByTestId("option-B").click();
    await submit.click();
    // chờ sang câu khác hoặc sang trang kết quả
    await expect(
      page
        .getByTestId("question-content")
        .filter({ hasNotText: before ?? "" })
        .or(page.getByTestId("cefr-level")),
    ).toBeVisible();
  }

  await expect(page.getByTestId("cefr-level")).toBeVisible();
  await page.getByTestId("go-review").click();
  await expect(page.getByTestId("review-entry").first()).toBeVisible();
});

test("giảng viên: tạo nháp, gửi duyệt, duyệt; câu đã duyệt chỉ sao chép", async ({ page }) => {
  await login(page, "gv001@example.test");
  await expect(page).toHaveURL(/\/teacher\/items/);

  await page.getByTestId("create-item").click();
  await page.getByLabel("Nội dung câu hỏi").fill("Chọn đáp án đúng: Birds ____ fly.");
  for (const [k, v] of Object.entries({ A: "can", B: "cans", C: "canning", D: "cannot to" })) {
    await page.getByLabel(`Phương án ${k}`, { exact: true }).fill(v);
  }
  await page.getByLabel("Độ khó b (-3 đến 3)").fill("-1.5");
  await page.getByTestId("submit-review").click();
  await expect(page.getByTestId("item-status")).toHaveText("Chờ duyệt");
  await expect(page.getByTestId("pending-notice")).toBeVisible();

  await page.goto("/teacher/review-queue");
  await page.getByTestId("approve").first().click();

  await page.goto("/teacher/items");
  await page.getByTestId("filter-status").selectOption("APPROVED");
  await page.getByTestId("item-row").first().getByRole("link").click();
  await expect(page.getByTestId("approved-notice")).toBeVisible();
  await expect(page.getByTestId("edit-item")).toHaveCount(0);
  await expect(page.getByTestId("delete-item")).toHaveCount(0);
  await page.getByTestId("clone-item").click();
  await expect(page).toHaveURL(/\/edit$/);
});

test("giảng viên: báo cáo và tra cứu đúng MSSV", async ({ page }) => {
  await login(page, "gv001@example.test");
  await page.goto("/teacher/reports");
  await expect(page.getByTestId("report-total")).toBeVisible();

  await page.goto("/teacher/students");
  await page.getByTestId("mssv-input").fill("SV2026002"); // khác trường ⇒ không có quyền
  await page.getByTestId("mssv-search").click();
  await expect(page.getByTestId("student-not-found")).toBeVisible();

  await page.getByTestId("mssv-input").fill("SV2026001");
  await page.getByTestId("mssv-search").click();
  await expect(page.getByTestId("student-name")).toContainText("SV2026001");
});
