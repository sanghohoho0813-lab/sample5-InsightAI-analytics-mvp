import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * CTA 문구 — 여기만 고치면 모든 샘플 페이지에 반영된다.
 * (링크 주소는 lib/brand.ts 의 BRAND.links 또는 아래 props 로 관리)
 */
const CTA_COPY = {
  badge: BRAND.companyEn,
  eyebrow: `이 샘플은 ${BRAND.companyShort}이 기획·제작했습니다`,
  headline: "이 샘플이 마음에 드셨다면,\n대표님 회사도 이렇게 설계해볼 수 있습니다.",
  description: `${BRAND.companyShort}은 평범한 회사를 기술·데이터·AI 기반의 성장형 기업으로 바꾸는\nAX / MVP / 플랫폼 기획·개발을 진행합니다.`,
  primary: "우리 회사도 만들어보기",
  samples: "다른 샘플 보기",
  home: `${BRAND.companyShort} 홈페이지`,
} as const;

/**
 * 샘플 페이지 공통 브릿지 CTA.
 * 샘플을 다 본 사용자를 상담 / 다른 샘플 / 홈페이지로 연결한다.
 * 로고는 페이지 상단·사이드바에 이미 있으므로 여기서는 중복 노출하지 않는다.
 */
export default function SampleBridgeCTA({
  consultHref = BRAND.links.consult,
  samplesHref = BRAND.links.samples,
  homeHref = BRAND.links.home,
  className = "",
}: {
  consultHref?: string;
  samplesHref?: string;
  homeHref?: string;
  className?: string;
}) {
  const subLink =
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface whitespace-nowrap px-5 text-[18px] font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand";

  return (
    <section
      aria-labelledby="sample-bridge-cta-title"
      className={`cta-surface animate-fade-up overflow-hidden rounded-3xl border border-brand/15 px-6 py-10 text-center md:px-10 md:py-12 ${className}`}
    >
      <p className="cta-badge inline-flex items-center rounded-full border border-brand/25 bg-surface px-3.5 py-1.5 text-[14px] font-bold tracking-[0.16em] text-brand">
        {CTA_COPY.badge}
      </p>

      <p className="mt-4 break-keep text-[18px] font-semibold text-ink-soft">{CTA_COPY.eyebrow}</p>

      <h2
        id="sample-bridge-cta-title"
        className="mx-auto mt-2 max-w-[22ch] whitespace-pre-line break-keep text-[26px] font-bold leading-[1.35] tracking-tight text-ink sm:max-w-none sm:text-[30px]"
      >
        {CTA_COPY.headline}
      </h2>

      <p className="mx-auto mt-3.5 max-w-[60ch] whitespace-pre-line break-keep text-[18px] leading-relaxed text-ink-soft">
        {CTA_COPY.description}
      </p>

      <div className="mt-8 flex flex-col items-center gap-4">
        <a
          href={consultHref}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-sweep relative isolate inline-flex min-h-[60px] w-full max-w-[420px] items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-brand-dark whitespace-nowrap px-6 text-[19px] font-bold text-white sm:px-8 sm:text-[21px] shadow-[0_10px_28px_-12px_rgba(20,120,255,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-12px_rgba(20,120,255,0.7)] sm:w-auto"
        >
          {CTA_COPY.primary}
          <ArrowRight className="h-6 w-6" />
        </a>

        <div className="flex w-full flex-col items-center gap-2.5 sm:w-auto sm:flex-row">
          <a href={samplesHref} target="_blank" rel="noopener noreferrer" className={`${subLink} w-full sm:w-auto`}>
            {CTA_COPY.samples}
            <ArrowUpRight className="h-5 w-5" />
          </a>
          <a href={homeHref} target="_blank" rel="noopener noreferrer" className={`${subLink} w-full sm:w-auto`}>
            {CTA_COPY.home}
            <ArrowUpRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
