import type { NextConfig } from "next";
// Side-effect: kiểm tra biến môi trường ngay khi build/start (fail-fast).
import "./src/lib/env";

const nextConfig: NextConfig = {
  output: "standalone",
  // Chỉ ảnh hưởng `next dev`: cho phép mở bằng IP mạng LAN (vd. http://10.10.60.2:3000).
  // Đặt ALLOWED_DEV_ORIGINS="10.10.60.2,192.168.1.5" (phân tách bằng dấu phẩy) khi cần.
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/student", destination: "/" },
      { source: "/student/dashboard", destination: "/" },
      { source: "/student/exams", destination: "/exams" },
      { source: "/student/exams/:roundId", destination: "/exams/:roundId" },
      { source: "/student/history", destination: "/history" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
