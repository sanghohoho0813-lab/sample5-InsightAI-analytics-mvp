import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import ToastStack from "@/components/ToastStack";
import AnalysisOverlay from "@/components/AnalysisOverlay";

export const metadata: Metadata = {
  title: "InsightAI — AI 데이터 분석·예측 SaaS",
  description:
    "데이터를 업로드하면 AI가 핵심 변화, 이상징후, 예측, 다음 행동까지 알려주는 데이터 인사이트 SaaS",
};

export const viewport: Viewport = {
  themeColor: "#060f1e",
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
