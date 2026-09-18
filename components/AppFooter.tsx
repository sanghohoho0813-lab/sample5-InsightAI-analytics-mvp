import Link from "next/link";
import { MiraeSymbol } from "./MiraeLogo";
import SampleBridgeCTA from "./SampleBridgeCTA";
import { BRAND } from "@/lib/brand";

/**
 * 모든 앱 화면 하단 — 공통 브릿지 CTA + 최소 크레딧.
 * 로고는 사이드바·툴바에 이미 있으므로 여기서는 심볼만 작게 쓴다.
 */
export default function AppFooter() {
  return (
    <footer className="mt-10">
      <SampleBridgeCTA />

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-line pt-6 text-center text-[15px] text-ink-dim">
        <MiraeSymbol height={24} />
        <span>
          © {BRAND.company} · {BRAND.product} {BRAND.productTagline} 데모
        </span>
        <span className="hidden h-3.5 w-px bg-line-strong sm:block" />
        <Link href="/intro" className="font-semibold text-brand transition-colors hover:text-brand-dark">
          서비스 소개
        </Link>
      </div>
    </footer>
  );
}
