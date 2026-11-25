# OpenAPI snapshot

`openapi.json` là bản sao của backend tại commit `944f1132a4fe525f7bf681f780fb7156e7bfd542` (blob `ea916fb843765d2f7fa02931513b34566c04f2c6`). Sinh kiểu bằng `npm run gen:api`; CI đối chiếu snapshot và kiểu đã commit. Commit backend chưa được push hoặc review; sau khi merge backend, đối chiếu và ghim lại SHA được duyệt.

PR này chuyển hạ tầng lên nền develop; 34 lời gọi dùng kiểu viết tay còn trong `scripts/api-type-debt.json`, gồm `Paged<ItemRow>`. Chúng chưa được bảo vệ bằng kiểu sinh và cần chuyển dần sau khi đối chiếu runtime. Endpoint GET/POST quản trị kỳ thi chưa có trong spec backend nền develop; bổ sung cùng tính năng. GET `/items` hiện trả mảng ở backend nền, còn phân trang phải đồng bộ khi nhánh teacher-review được tích hợp.

Rule `check-api-types.cjs` ngăn tăng số lời gọi kiểu tay trực tiếp qua `apiRequest`/`apiUpload` so với baseline, nhưng không bao quát mọi alias, fetch riêng hoặc phép ép kiểu. Workflow kiểm tra chéo theo SHA và workflow cảnh báo drift không thay thế review hay kiểm thử runtime.
