import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Select gốc của trình duyệt (tốt cho bàn phím/di động); dùng cho bộ lọc và form. */
export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
