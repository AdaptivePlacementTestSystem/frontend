import type { NextConfig } from "next";
// Side-effect: kiểm tra biến môi trường ngay khi build/start (fail-fast).
import "./src/lib/env";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
