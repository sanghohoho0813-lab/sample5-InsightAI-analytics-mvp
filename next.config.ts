import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // 대표 도메인(/)으로 접속하면 바로 대시보드를 보여준다. 서비스 소개는 /intro.
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
