import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import ToastStack from "@/components/ToastStack";
import AnalysisOverlay from "@/components/AnalysisOverlay";
import Script from "next/script";

export const metadata: Metadata = {
  title: { default: "InsightAI — 미래에이아이랩 AI 데이터 분석·예측 SaaS", template: "%s · InsightAI" },
  description:
    "미래에이아이랩(MIRAE AI LAB)이 제작한 AI 데이터 분석 SaaS 레퍼런스. 데이터를 업로드하면 AI가 핵심 변화, 이상징후, 예측, 다음 행동까지 알려줍니다.",
  applicationName: "InsightAI",
  authors: [{ name: "미래에이아이랩" }],
  creator: "미래에이아이랩",
  publisher: "미래에이아이랩",
  openGraph: {
    title: "InsightAI — 데이터를 넣으면 무엇이 변했고 무엇을 해야 하는지 알려줍니다",
    description: "핵심 지표 비교, 이상치 감지, 7일 예측, 실행 제안까지. 미래에이아이랩이 만든 분석 SaaS 샘플.",
    type: "website",
    locale: "ko_KR",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f6f5f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* 미래AI랩 데모 공용 뒤로·앞으로 버튼 */}
        <Script src="/mirae-history-nav.js" strategy="beforeInteractive" />
        <AppProvider>
          {children}
          <AnalysisOverlay />
          <ToastStack />
        </AppProvider>
      </body>
    </html>
  );
}
