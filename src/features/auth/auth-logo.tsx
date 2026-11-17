import { cn } from "cn";

/** Logo hệ thống (đặc tả Mục 2.1): ô vuông bo góc xanh #2563EB, đường cong chữ S đi lên, kết thúc bằng dấu tích. */
export function AuthLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="10" fill="#2563EB" />
        <path
          d="M9 25 C15 25 14 18 18 18 C22 18 21 11 27 11"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M23.5 14.5 L26 17 L30 11.5"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(-4 7)"
        />
      </svg>
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold text-[#004ac6]">Adaptive Placement Test</span>
          <span className="text-xs font-medium text-muted-foreground">
            Kiểm tra xếp lớp tiếng Anh thích ứng
          </span>
        </div>
      )}
    </div>
  );
}
