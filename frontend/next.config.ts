import path from "node:path";
import type { NextConfig } from "next";

// Backend NestJS (backend/). Trình duyệt chỉ gọi /api/... cùng origin; Next.js chuyển tiếp sang đây,
// nên frontend không cần biết địa chỉ backend và không cần cấu hình CORS.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Gốc repo: cho phép import thư mục shared/ (mã dùng chung với backend) nằm ngoài frontend/.
  turbopack: { root: path.join(__dirname, "..") },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  experimental: {
    // File ghi âm tối đa 25 MB đi qua proxy.
    proxyClientMaxBodySize: "26mb",
    // Request chậm nhất (upload audio, tổng hợp thống kê lớp) vẫn trả về trong thời gian này; ASR/chấm chạy ở worker.
    proxyTimeout: 120_000,
  },
};

export default nextConfig;
