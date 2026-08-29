import Link from "next/link";
import { MiraeWordmark } from "./MiraeLogo";
import { BRAND } from "@/lib/brand";

/** 모든 앱 화면 하단에 노출되는 제작 크레딧 */
export default function AppFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-2.5 border-t border-line pt-7 text-center">
      <MiraeWordmark height={60} />
      <p className="text-[16px] leading-relaxed text-ink-soft">{BRAND.credit}</p>
      <p className="text-[14px] text-ink-dim">
        © {BRAND.company} · {BRAND.product} {BRAND.productTagline} 데모
      </p>
    </footer>
  );
}
