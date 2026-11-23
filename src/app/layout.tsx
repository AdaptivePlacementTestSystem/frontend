import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive Placement Test",
  description: "Hệ thống kiểm tra xếp lớp tiếng Anh thích ứng",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: tiện ích trình duyệt (Katalon, v.v.) hay chèn thuộc tính vào <html> trước khi React chạy
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnamPro.variable} ${geistMono.variable} h-full antialiased font-sans`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-surface text-on-surface">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
