import { describe, it, expect } from "vitest";
import { newPasswordSchema } from "@/features/auth/password-schema";

describe("Password Policy - newPasswordSchema", () => {
  it("từ chối mật khẩu dưới 8 ký tự", () => {
    const res = newPasswordSchema.safeParse("Ab1!");
    expect(res.success).toBe(false);
  });

  it("từ chối mật khẩu không có chữ hoa", () => {
    const res = newPasswordSchema.safeParse("student@123");
    expect(res.success).toBe(false);
  });

  it("từ chối mật khẩu không có chữ thường", () => {
    const res = newPasswordSchema.safeParse("STUDENT@123");
    expect(res.success).toBe(false);
  });

  it("từ chối mật khẩu không có số", () => {
    const res = newPasswordSchema.safeParse("Student@abc");
    expect(res.success).toBe(false);
  });

  it("từ chối mật khẩu không có ký tự đặc biệt", () => {
    const res = newPasswordSchema.safeParse("Student1234");
    expect(res.success).toBe(false);
  });

  it("chấp nhận mật khẩu thỏa mãn đầy đủ chính sách (8+ ký tự, thường, hoa, số, ký tự đặc biệt)", () => {
    const res = newPasswordSchema.safeParse("Student@123456");
    expect(res.success).toBe(true);
  });
});
