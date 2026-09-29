"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SampleBridgeCTA from "./SampleBridgeCTA";
import { BRAND } from "@/lib/brand";

/**
 * 제작사 브릿지 CTA는 '한 흐름을 다 본 뒤'에만 보여준다.
 * - 대시보드: 첫 화면 끝까지 본 방문자
 * - 저장된 보고서 상세: 핵심 흐름 완료 지점
 * - 더보기(모바일 메뉴)
 * 분석·이상 감지·데이터·설정 같은 작업 중 화면에는 외부 CTA를 두지 않는다.
 */
function FooterInner() {
  const pathname = usePathname();
  const params = useSearchParams();
  const showCta =
    pathname === "/dashboard" || pathname === "/more" || (pathname === "/reports" && params.has("id"));

  return (
    <footer className="mt-12">
      {showCta && <SampleBridgeCTA className="mb-8" />}
      {/* 데스크톱은 사이드바에 제작 표기가 있으므로 모바일에서만 한 줄 크레딧을 둔다 */}
      <p className="border-t border-line pt-6 text-center text-caption text-ink-dim lg:hidden">
        © {BRAND.company} · {BRAND.product} 데모 ·{" "}
        <Link href="/intro" className="font-semibold text-ink-soft underline-offset-2 hover:underline">
          서비스 소개
        </Link>
      </p>
    </footer>
  );
}

export default function AppFooter() {
  return (
    <Suspense fallback={null}>
      <FooterInner />
    </Suspense>
  );
}
