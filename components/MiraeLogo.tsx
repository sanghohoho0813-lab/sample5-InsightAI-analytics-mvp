import Image from "next/image";
import { BRAND } from "@/lib/brand";

/** 미래에이아이랩 심볼(M 마크) */
export function MiraeSymbol({ height = 34, className = "" }: { height?: number; className?: string }) {
  return (
    <Image
      src={BRAND.logo.symbol}
      alt={`${BRAND.company} 심볼`}
      width={Math.round(height * BRAND.logo.symbolRatio)}
      height={height}
      priority
      className={className}
    />
  );
}

/**
 * 가로형 전체 로고.
 * 한글 워드마크가 판독되려면 높이 36px 이상이 필요하다. 더 좁은 곳에서는 MiraeSymbol을 쓴다.
 */
export function MiraeWordmark({
  height = 56,
  className = "",
  variant = "dark",
}: {
  height?: number;
  className?: string;
  /** dark = 밝은 배경용(기본), light = 어두운 배경용 */
  variant?: "dark" | "light";
}) {
  return (
    <Image
      src={variant === "light" ? BRAND.logo.fullLight : BRAND.logo.full}
      alt={`${BRAND.company} 로고`}
      width={Math.round(height * BRAND.logo.fullRatio)}
      height={height}
      priority
      className={className}
    />
  );
}
