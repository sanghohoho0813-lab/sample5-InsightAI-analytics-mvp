import {
  AlertTriangle,
  BarChart3,
  Database,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  MessageSquareText,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** 모바일 '더보기'에서 보조 설명 */
  hint: string;
}

/** 핵심 분석 흐름 — 사용 빈도 순 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard, hint: "이번 기간에 무슨 일이 있었고 무엇을 할지" },
  { href: "/anomalies", label: "이상 감지", icon: AlertTriangle, hint: "평소와 다른 날과 원인 조사" },
  { href: "/insights", label: "인사이트", icon: Lightbulb, hint: "변화의 이유와 실행 제안" },
  { href: "/analytics", label: "분석", icon: BarChart3, hint: "지표 추이와 채널·상품별 분해" },
  { href: "/forecast", label: "예측", icon: LineChart, hint: "다음 7일 추정치" },
  { href: "/reports", label: "보고서", icon: FileText, hint: "저장한 보고서와 PDF 출력" },
];

/** 작업 공간 — 데이터·질의·설정 */
export const WORKSPACE_NAV: NavItem[] = [
  { href: "/data", label: "데이터", icon: Database, hint: "업로드 진단 · 샘플 데이터 · 분석 기록" },
  { href: "/ai", label: "데이터 질의", icon: MessageSquareText, hint: "지금 데이터에 묻고 근거와 함께 답 받기" },
  { href: "/settings", label: "설정", icon: Settings, hint: "기본 기간 · 데모 초기화" },
];

export const ALL_NAV = [...PRIMARY_NAV, ...WORKSPACE_NAV];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
