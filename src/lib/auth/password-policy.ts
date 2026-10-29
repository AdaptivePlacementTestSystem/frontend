/** Độ dài mật khẩu tối thiểu (BR-06, Q-4 còn mở: đề xuất 8). Đọc từ cấu hình, không hardcode ở component. */
const parsed = Number(process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH);
export const PASSWORD_MIN_LENGTH = Number.isInteger(parsed) && parsed >= 6 ? parsed : 8;
