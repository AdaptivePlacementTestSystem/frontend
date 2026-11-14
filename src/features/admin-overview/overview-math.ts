/** Tỷ lệ phần trăm của `count` trên `total` (0 khi tổng bằng 0); chỉ để hiển thị. */
export function percentOf(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

/** "36,8%" (một chữ số thập phân, dấu phẩy kiểu Việt Nam). */
export function formatPercent(value: number): string {
  return `${value.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Số nguyên có dấu chấm ngăn cách hàng nghìn: 1240 → "1.240". */
export function formatCount(value: number): string {
  return value.toLocaleString("vi-VN");
}
