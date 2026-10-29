# Adaptive Placement Test — Frontend

Giao diện web cho hệ thống kiểm tra xếp lớp tiếng Anh thích ứng (CAT–Rasch). Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui.

> Frontend **chỉ hiển thị và thu thập dữ liệu**; mọi tính toán CAT (EAP, chọn câu, điều kiện dừng, CEFR) nằm ở Backend.
> Kế hoạch & theo dõi: `D:\TLCN\Tuan4\KE_HOACH_TRIEN_KHAI_FRONTEND.md`, `D:\TLCN\Tuan4\TRACKING_TRIEN_KHAI_FRONTEND.md`.
> Quyết định thiết kế: `0.docs/tracking/DECISIONS_LOG.md` (#48–#57).

## Yêu cầu

- Node.js ≥ 22 (đang dùng 24), npm.
- Backend NestJS chạy tại `API_BASE_URL` (hoặc dùng dữ liệu giả lập MSW — sẽ có ở FE2).

## Chạy thử

```bash
npm install
cp .env.example .env.local     # rồi sửa API_BASE_URL nếu cần
npm run dev                    # http://localhost:3000
```

## Biến môi trường

| Biến                   | Bắt buộc | Mô tả                                                                             |
| ---------------------- | -------- | --------------------------------------------------------------------------------- |
| `API_BASE_URL`         | Có       | URL gốc Backend kèm prefix (vd. `http://localhost:3001/api/v1`). Chỉ server dùng. |
| `NEXT_PUBLIC_APP_NAME` | Không    | Tên hiển thị. Là biến công khai — **không** đặt bí mật vào biến `NEXT_PUBLIC_*`.  |

Thiếu/sai biến ⇒ `npm run dev|build|start` báo lỗi ngay (kiểm tra bằng zod, `src/lib/env-schema.ts`).
Repo này **công khai**: không commit `.env*` (trừ `.env.example`), token, dữ liệu sinh viên hay nội dung câu hỏi chưa rõ giấy phép.

## Lệnh

| Lệnh                                          | Việc                                                            |
| --------------------------------------------- | --------------------------------------------------------------- |
| `npm run dev` / `build` / `start`             | Chạy dev / build / chạy bản build                               |
| `npm run lint` · `typecheck` · `format:check` | ESLint · TypeScript · Prettier                                  |
| `npm test` · `test:cov`                       | Vitest (+ độ phủ, cần đo thật mới ghi số)                       |
| `npm run test:e2e`                            | Playwright (cài trình duyệt: `npx playwright install chromium`) |

## CI/CD

Pipeline GitHub Actions `.github/workflows/pipeline.yml`:

1. **build-test:** `npm ci` → lint → jscpd (trùng lặp ≤ 3%) → typecheck → kiểm định dạng → test + coverage → build → (SonarCloud nếu có `SONAR_TOKEN`)
2. **security:** gitleaks (toàn lịch sử), `npm audit --omit=dev --audit-level=high`, dependency-review (trên PR)
3. **package:** build image Docker (`Dockerfile`), đẩy GHCR, tag theo mã commit (chỉ khi push vào `develop`)
4. **deploy:** SSH vào server staging, chạy `deploy.sh` (do pipeline backend chép lên server)

Rollback: `rollback.yml`. Health: `GET /api/health` (sâu, 503 nếu backend không sẵn sàng), `GET /api/health/live`. Secrets lưu trong GitHub Environment `staging`.

Tài liệu liên quan: [`CODING_CONVENTION.md`](./CODING_CONVENTION.md), [`TECH_DEBT.md`](./TECH_DEBT.md).

## Cấu trúc thư mục

```
src/
  app/                  # App Router; api/proxy/[...path] = BFF (FE3.2)
  components/ui/        # shadcn/ui (sinh tự động, không sửa tay nếu không cần)
  features/{auth,exam,result,history,items,reports}/
  lib/                  # api/ (client, endpoints, errors), auth/, env, enums
  messages/vi.ts        # mọi chuỗi hiển thị (chỉ tiếng Việt)
  mocks/                # MSW + fixtures (dữ liệu giả, gắn nhãn mock)
tests/{unit,e2e}/
```

## Chạy bằng backend giả (khi Backend chưa sẵn sàng)

```bash
MOCK_API=1 API_BASE_URL=http://localhost:3001/api/v1 npm run dev
```

`src/instrumentation.ts` bật MSW phía server và trả dữ liệu mẫu tự soạn (`src/mocks/`; **không phải dữ liệu thật**). Tài khoản mẫu, mật khẩu `password123`: `sv001@example.test` / `sv002@example.test` (sinh viên), `gv001@example.test` (giảng viên), `admin@example.test`, `locked@example.test` (bị khóa). Số câu mỗi bài mock đặt bằng `MOCK_MAX_ITEMS` (mặc định 6). Không bao giờ đặt `MOCK_API` ở môi trường thật. `npm run test:e2e` tự bật chế độ này.

## Lưu ý

- Token đăng nhập sẽ nằm trong cookie `httpOnly` do lớp BFF đặt; **không** dùng `localStorage`.
- `src/proxy.ts` (Next 16 thay `middleware.ts`) chặn route theo vai trò chỉ để UX đúng — **không phải lớp bảo mật**; Backend mới là nơi kiểm quyền.
- Kiểu dữ liệu API: tạm viết tay (`src/lib/enums.ts`), sẽ thay bằng kiểu sinh từ OpenAPI khi Backend có Swagger.
