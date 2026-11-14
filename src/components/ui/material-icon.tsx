import { cn } from "@/lib/utils";

/** Biểu tượng Material Symbols (cùng bộ biểu tượng với bản thiết kế Stitch). `name` là tên biểu tượng, ví dụ "dashboard". */
export function MaterialIcon({
  name,
  className,
  size = 20,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
