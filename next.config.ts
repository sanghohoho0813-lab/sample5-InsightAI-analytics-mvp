import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    // 기본 보안 헤더. 미래AI랩 사이트가 샘플을 미리보기 틀(iframe)로 띄울 수 있도록,
    // 틀 허용은 자기 자신과 miraeailab.com으로만 제한한다(그 외 사이트의 클릭 가로채기 방지).
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://miraeailab.com https://*.miraeailab.com" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // 대표 도메인(/)으로 접속하면 바로 대시보드를 보여준다. 서비스 소개는 /intro.
      { source: "/", destination: "/dashboard", permanent: false },
      // 통합된 메뉴 — 예전 주소로 들어와도 새 위치로 보낸다.
      { source: "/notifications", destination: "/anomalies", permanent: false },
      { source: "/explore", destination: "/analytics", permanent: false },
    ];
  },
};

export default nextConfig;
