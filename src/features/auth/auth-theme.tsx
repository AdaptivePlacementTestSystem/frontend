import type { ReactNode } from "react";
import { Be_Vietnam_Pro } from "next/font/google";
import { cn } from "cn";

const authFont = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Bao quanh 4 màn xác thực: font Be Vietnam Pro + bảng màu xanh (`.auth-theme` trong globals.css). */
export function AuthTheme({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(authFont.className, "auth-theme min-h-screen bg-background", className)}>
      {children}
    </div>
  );
}
