"use client";

import { useEffect } from "react";

/**
 * Gắn lớp theme Admin (bảng màu Stitch + font Be Vietnam Pro) vào <body> trong lúc ở khu Admin.
 * Gắn ở <body> để hộp thoại và thông báo (render ngoài cây chính) cũng đúng màu/font.
 */
export function AdminThemeScope({ fontClass }: { fontClass: string }) {
  useEffect(() => {
    const classes = ["admin-theme", ...fontClass.split(" ").filter(Boolean)];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [fontClass]);
  return null;
}
