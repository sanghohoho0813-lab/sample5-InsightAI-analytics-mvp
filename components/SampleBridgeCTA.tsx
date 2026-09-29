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
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface whitespace-nowrap px-5 text-sub font-semibold text-ink-soft transition-colors hover:border-ink-dim hover:text-ink";

  return (
    <section
      aria-labelledby="sample-bridge-cta-title"
      className={`cta-surface overflow-hidden rounded-panel border border-line px-5 py-10 text-center md:px-10 md:py-12 ${className}`}
    >
      <p className="cta-badge inline-flex items-center rounded-full border border-brand/25 bg-surface px-3 py-1 text-caption font-bold tracking-[0.14em] text-brand">
        {CTA_COPY.badge}
      </p>

      <p className="mt-4 text-sub font-semibold text-ink-soft">{CTA_COPY.eyebrow}</p>

      <h2
        id="sample-bridge-cta-title"
        className="mx-auto mt-2 max-w-[20ch] whitespace-pre-line text-title font-bold tracking-tight text-ink sm:max-w-none"
      >
        {CTA_COPY.headline}
      </h2>

      <p className="mx-auto mt-3 max-w-[60ch] text-body text-ink-soft md:whitespace-pre-line">
        {CTA_COPY.description}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <a
          href={consultHref}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-sweep relative isolate inline-flex min-h-14 w-full max-w-[400px] items-center justify-center gap-2 overflow-hidden rounded-control bg-brand whitespace-nowrap px-6 text-lead font-bold text-white shadow-raised transition-colors hover:bg-brand-dark sm:w-auto sm:px-8"
        >
          {CTA_COPY.primary}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </a>

        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
          <a href={samplesHref} target="_blank" rel="noopener noreferrer" className={`${subLink} w-full sm:w-auto`}>
            {CTA_COPY.samples}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
          <a href={homeHref} target="_blank" rel="noopener noreferrer" className={`${subLink} w-full sm:w-auto`}>
            {CTA_COPY.home}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
