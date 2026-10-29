# Danh mục nợ kỹ thuật (Frontend)

Cập nhật khi phát hiện hoặc xử lý. Mức: 🔴 chặn sử dụng thật · 🟠 nên xử lý sớm · 🟡 cải thiện.

| #   | Mức | Nợ                                                                                            | Hệ quả                                                     | Kế hoạch xử lý                                                         |
| --- | --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | 🟠  | Mới có khung ứng dụng; chưa có đăng nhập, làm bài thi, kết quả, quản lý câu hỏi               | Chưa dùng được cho người dùng                              | Làm theo kế hoạch triển khai Frontend (repo `0.docs`)                  |
| 2   | 🟠  | Enum và kiểu API viết tay (`src/lib/enums.ts`)                                                | Có thể lệch với backend                                    | Thay bằng kiểu sinh từ OpenAPI khi backend có Swagger                  |
| 3   | 🟡  | Mới có 1 test E2E; test đơn vị chỉ bao phần nền (env, enum, health)                           | Độ phủ chức năng thấp                                      | Viết test cho từng tính năng khi làm                                   |
| 4   | 🟡  | `npm audit` đầy đủ còn cảnh báo ở thư viện chỉ dùng khi phát triển (chuỗi eslint-config-next) | Không ảnh hưởng bản chạy thật (`npm audit --omit=dev` = 0) | Nâng phiên bản khi có bản vá; không dùng `--force`                     |
| 5   | 🟡  | Mã shadcn/ui sinh sẵn bị loại khỏi báo cáo coverage                                           | Số coverage chỉ tính mã tự viết                            | Giữ loại trừ, ghi rõ ở `sonar-project.properties`, `vitest.config.mts` |
| 6   | 🟡  | Action GitHub ghim theo thẻ, chưa ghim theo SHA                                               | Rủi ro chuỗi cung ứng nhỏ                                  | Ghim SHA khi pipeline đã ổn định                                       |
