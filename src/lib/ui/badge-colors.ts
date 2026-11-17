import type { CefrLevelValue as CefrLevel, ItemStatusValue as ItemStatus } from "@apt/shared-types";

/**
 * Màu huy hiệu theo UI đã chốt (mô tả màn hình, Mục 2.1 và 2.2). Nhãn chữ lấy ở `vi.cefrLevel` / `vi.itemStatus`
 * (luôn kèm chữ, không dùng màu đơn độc để truyền thông tin).
 */
export interface Swatch {
  /** Màu nền (cũng dùng cho thanh ngang). */
  bg: string;
  /** Màu chữ đặt trên nền đó. */
  fg: string;
}

export const CEFR_COLORS: Record<CefrLevel, Swatch> = {
  PRE_A1: { bg: "#E0F2FE", fg: "#0C4A6E" },
  A1: { bg: "#BAE6FD", fg: "#0C4A6E" },
  A2: { bg: "#7DD3FC", fg: "#0C4A6E" },
  B1: { bg: "#38BDF8", fg: "#0C4A6E" },
  B2: { bg: "#0EA5E9", fg: "#FFFFFF" },
  C1_PLUS: { bg: "#0369A1", fg: "#FFFFFF" },
};

export const ITEM_STATUS_COLORS: Record<ItemStatus, Swatch> = {
  DRAFT: { bg: "#94A3B8", fg: "#FFFFFF" },
  FIRST_APPROVED: { bg: "#F59E0B", fg: "#FFFFFF" },
  SECOND_APPROVED: { bg: "#14B8A6", fg: "#FFFFFF" },
  FINAL_APPROVED: { bg: "#16A34A", fg: "#FFFFFF" },
  REJECTED: { bg: "#DC2626", fg: "#FFFFFF" },
  AI_REJECTED: { bg: "#7C3AED", fg: "#FFFFFF" },
};
