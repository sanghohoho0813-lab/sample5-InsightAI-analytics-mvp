import Image from "next/image";
import { BRAND } from "@/lib/brand";

/** 미래에이아이랩 심볼 (원본 SVG) */
export function MiraeSymbol({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src={BRAND.logo.symbol}
      alt={`${BRAND.company} 심볼`}
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}

/** 원본 가로형 워드마크 — 충분히 큰 영역에서만 사용한다(작게 쓰면 한글이 뭉개짐). */
export function MiraeWordmark({ height = 90, className = "" }: { height?: number; className?: string }) {
  return (
    <Image
      src={BRAND.logo.horizontal}
      alt={`${BRAND.company} 로고`}
      width={Math.round((height * 1200) / 360)}
      height={height}
      priority
      className={className}
    />
  );
}

const LOCKUP = {
  sm: { symbol: 26, ko: "text-[15px]", en: "text-[9.5px]" },
  md: { symbol: 34, ko: "text-[19px]", en: "text-[11.5px]" },
  lg: { symbol: 46, ko: "text-[26px]", en: "text-[14px]" },
  xl: { symbol: 60, ko: "text-[34px]", en: "text-[17px]" },
} as const;

/**
 * 브랜드 락업 — 심볼(원본 SVG) + 텍스트를 직접 조판한다.
 * 원본 워드마크를 축소하면 한글이 뭉개지므로 앱 내부에서는 이 컴포넌트를 사용한다.
 */
export function MiraeLockup({
  size = "md",
  className = "",
}: {
  size?: keyof typeof LOCKUP;
  className?: string;
}) {
  const s = LOCKUP[size];
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <MiraeSymbol size={s.symbol} />
      <span className="leading-tight">
        <span className={`block ${s.ko} font-extrabold tracking-tight text-ink`}>
          미래<span className="text-aqua">에이아이</span>랩
        </span>
        <span className={`block ${s.en} font-bold tracking-[0.16em] text-ink-dim`}>
          MIRAE <span className="text-aqua">AI</span> LAB
        </span>
      </span>
    </span>
  );
}
