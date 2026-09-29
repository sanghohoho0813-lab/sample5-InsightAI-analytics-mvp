"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { MiraeWordmark } from "@/components/MiraeLogo";
import SampleBridgeCTA from "@/components/SampleBridgeCTA";
import { BRAND } from "@/lib/brand";
import { getDemoDatasets } from "@/lib/demo-data";
import { useApp } from "@/lib/store";
import { btn } from "@/lib/ui";

const STEPS = [
  { title: "데이터를 넣습니다", desc: "CSV·XLSX 파일을 올리거나 샘플 데이터를 고릅니다. 필수 컬럼은 날짜와 매출뿐입니다." },
  { title: "무엇이 변했는지 봅니다", desc: "핵심 지표를 이전 기간과 비교하고, 급증·급감 같은 이상치와 그 원인 채널을 찾아냅니다." },
  { title: "다음 행동을 정합니다", desc: "변화의 이유와 실행 제안을 확인하고, 결과를 보고서로 저장해 공유합니다." },
];

export default function IntroPage() {
  const { startAnalysis } = useApp();
  const datasets = getDemoDatasets();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Logo />
        <Link href="/dashboard" className={btn.secondary}>
          대시보드
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 md:px-8 md:pt-16">
        <p className="text-sub font-semibold text-brand">{BRAND.productTagline}</p>
        <h1 className="mt-3 max-w-[18ch] text-display font-bold tracking-tight text-ink">
          데이터를 넣으면, 무엇이 변했고 무엇을 해야 하는지 알려줍니다
        </h1>
        <p className="mt-5 max-w-2xl text-lead text-ink-soft">
          분석가가 없는 팀을 위한 분석 도구입니다. 핵심 지표 비교, 이상치 감지, 다음 7일 예측, 실행 제안까지 한 화면에서 확인하고
          보고서로 남깁니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <button onClick={() => startAnalysis(datasets[0])} className={btn.primary}>
            샘플 데이터로 체험하기
          </button>
          <Link href="/data" className={btn.secondary}>
            내 파일 올리기
          </Link>
        </div>
        <p className="mt-3 text-meta text-ink-dim">회원가입 없이 바로 사용 · 모든 데이터는 이 브라우저에만 저장됩니다</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 md:px-8" aria-labelledby="how">
        <h2 id="how" className="text-title font-bold text-ink">
          이렇게 동작합니다
        </h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t-2 border-ink pt-4">
              <p className="tabular text-meta font-semibold text-ink-dim">0{i + 1}</p>
              <p className="mt-1 text-card font-bold text-ink">{s.title}</p>
              <p className="mt-2 text-sub text-ink-soft">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 md:px-8" aria-labelledby="samples">
        <h2 id="samples" className="text-title font-bold text-ink">
          샘플 데이터
        </h2>
        <div className="card mt-6">
          <ul className="divide-y divide-line">
            {datasets.map((ds) => (
              <li key={ds.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">{ds.name}</p>
                  <p className="mt-1 text-meta text-ink-soft">{ds.description}</p>
                </div>
                <button onClick={() => startAnalysis(ds)} className={btn.secondary}>
                  분석하기
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 md:px-8">
        <SampleBridgeCTA />
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center md:px-8">
          <MiraeWordmark height={36} />
          <p className="text-caption text-ink-dim">
            © {BRAND.company} · {BRAND.product} {BRAND.productTagline} 데모
          </p>
        </div>
      </footer>
    </div>
  );
}
