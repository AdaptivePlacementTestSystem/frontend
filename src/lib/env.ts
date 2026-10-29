import { parseEnv, type Env } from "./env-schema";

/** Giá trị đã kiểm tra, đọc từ process.env khi module được nạp (chỉ dùng phía server). */
export const env: Env = parseEnv(process.env);
