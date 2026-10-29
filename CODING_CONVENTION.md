# Quy ước mã (Frontend)

## Phạm vi

- Frontend **chỉ hiển thị và thu thập dữ liệu**; mọi tính toán CAT (EAP, chọn câu, điều kiện dừng, CEFR) nằm ở backend. Không viết công thức θ/SE/CEFR ở đây.
- Không để token ở `localStorage`/`sessionStorage`; không dùng `dangerouslySetInnerHTML` với nội dung do người dùng nhập.

## Cấu trúc

- `src/app/` (route), `src/features/<tính-năng>/` (thành phần + hook của từng tính năng), `src/lib/` (api, auth, env, enums), `src/messages/vi.ts` (mọi chuỗi hiển thị), `src/components/ui/` (shadcn, sinh tự động).
- Chuỗi hiển thị cho người dùng đặt trong `src/messages/vi.ts`, không rải trong component.
- Giá trị cấu hình (URL API, số câu tối đa…) lấy từ biến môi trường/backend, không hardcode.

## Đặt tên và định dạng

- File component `PascalCase.tsx` hoặc theo quy ước Next (`page.tsx`, `route.ts`); hàm/biến `camelCase`; hằng `UPPER_SNAKE_CASE`.
- Định danh bằng tiếng Anh; chuỗi giao diện và chú thích bằng tiếng Việt.
- Định dạng bằng Prettier (`npm run format`), kiểm bằng `npm run format:check`; `tsconfig` bật `strict`.

## Chất lượng

- `npm run lint`, `npm run typecheck`, `npm run format:check` phải sạch để merge.
- Mã trùng lặp ≤ 3% (`npm run dup`).
- Test bằng Vitest + Testing Library (đơn vị/thành phần) và Playwright (E2E); mỗi tính năng mới có test đi kèm.

## Git

- Nhánh `feat|fix|docs|chore|test|refactor/<ten-chuc-nang>` vào `develop` qua Pull Request, có người kia review.
- Commit theo Conventional Commits; không commit bí mật, chỉ commit `.env.example`.
