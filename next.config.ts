import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/views가 런타임에 발행 slug 목록을 fs로 읽는다(레인 B, T033) —
  // 동적 경로 fs 접근은 파일 트레이싱에 안 잡히므로 명시 포함 (Vercel 서버리스 대응)
  outputFileTracingIncludes: {
    "/api/views": ["./content/posts/**"],
  },
};

export default nextConfig;
