import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import ToastStack from "@/components/ToastStack";
import AnalysisOverlay from "@/components/AnalysisOverlay";

export const metadata: Metadata = {
  title: "InsightAI — 미래에이아이랩 AI 데이터 분석·예측 SaaS",
  description:
    "미래에이아이랩(MIRAE AI LAB)이 제작한 AI 데이터 분석 SaaS 레퍼런스. 데이터를 업로드하면 AI가 핵심 변화, 이상징후, 예측, 다음 행동까지 알려줍니다.",
  applicationName: "InsightAI",
  authors: [{ name: "미래에이아이랩" }],
  creator: "미래에이아이랩",
  publisher: "미래에이아이랩",
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
        <AppProvider>
          {children}
          <AnalysisOverlay />
          <ToastStack />
        </AppProvider>
      </body>
    </html>
  );
}
