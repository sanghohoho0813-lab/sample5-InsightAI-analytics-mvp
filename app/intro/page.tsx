"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, LineChart, Lock, ScanSearch } from "lucide-react";
import Logo from "@/components/Logo";
import { MiraeWordmark } from "@/components/MiraeLogo";
import SampleBridgeCTA from "@/components/SampleBridgeCTA";
import SampleCard, { samplePreview } from "@/components/SampleCard";
import { AlertCard, BriefingPreview, ContributionPreview, DiagnosisPreview, TimelinePreview, WindowFrame } from "@/components/landing/Previews";
import { BRAND } from "@/lib/brand";
import { dailySeries, resolveDates } from "@/lib/analytics-engine";
import { summarize } from "@/lib/briefing";
import { contributions } from "@/lib/drivers";
import { investigate } from "@/lib/investigate";
import { getDemoDatasets } from "@/lib/demo-data";
import { useApp } from "@/lib/store";
import { Filters } from "@/lib/types";
import { btn } from "@/lib/ui";

const F30: Filters = { preset: "30", rangeDays: 30, channel: "all", product: "all" };

const STEPS = [
  {
    no: "01",
    title: "데이터를 넣으면, 먼저 진단합니다",
    desc: "어떤 열을 인식했는지, 무엇을 분석할 수 있고 무엇은 못 하는지, 날짜·매출에 문제가 없는지 보여준 뒤 분석을 시작합니다.",
  },
  {
    no: "02",
    title: "무엇이, 왜 변했는지 답합니다",
    desc: "증감분을 가장 많이 만든 채널·상품과, 그 변화가 방문자·전환율·객단가 중 어디서 왔는지 계산해 한 문장으로 말합니다.",
  },
  {
    no: "03",
    title: "평소와 다른 날을 끝까지 따라갑니다",
    desc: "언제 시작됐고 언제 회복했는지, 어디서 생겼는지, 무엇부터 확인할지 하나의 조사 흐름으로 이어지고 보고서로 남습니다.",
  },
];

const PRINCIPLES = [
  { icon: Check, title: "결론마다 근거", desc: "모든 문장 옆에 그 결론을 만든 계산값과 계산 방식을 함께 둡니다." },
  { icon: ScanSearch, title: "추정은 추정이라고", desc: "원인은 '가능성 높은 원인(추정)'으로, 예측은 추정치로 표시하고 효과 수치를 지어내지 않습니다." },
  { icon: Lock, title: "데이터는 브라우저 안에서", desc: "올린 파일은 서버로 보내지 않습니다. 회원가입 없이 바로 써볼 수 있습니다." },
];

export default function IntroPage() {
  const { startAnalysis } = useApp();
  const datasets = getDemoDatasets();
  // 데모 데이터는 '오늘'을 기준으로 만들어지므로, 서버와 브라우저의 날짜가 달라도 어긋나지 않게 마운트 뒤에 계산한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const preview = useMemo(() => {
    if (!mounted) return null;
    const ds = datasets[0];
    const b = summarize(ds, F30);
    const { currentDates } = resolveDates(ds.rows, F30);
    const trend = dailySeries(
      ds.rows.filter((r) => currentDates.includes(r.date)),
      currentDates
    ).map((p) => p.revenue);
    const alert = b.anomalies.find((a) => a.severity === "critical") ?? b.anomalies[0];
    const inv = alert ? investigate(ds, alert, F30) : null;
    const md = (d: string) => `${d.slice(5, 7)}.${d.slice(8)}`;
    return {
      b,
      trend,
      alert,
      inv,
      period: `${md(currentDates[0])} ~ ${md(currentDates[currentDates.length - 1])}`,
      split: contributions(ds.rows, F30, "channel").items,
      samples: Object.fromEntries(datasets.map((d) => [d.id, samplePreview(d)])),
    };
  }, [mounted, datasets]);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
          <Logo />
          <nav className="flex items-center gap-1" aria-label="소개 메뉴">
            <a href="#how" className="hidden min-h-11 items-center px-3 text-sub font-medium text-ink-soft hover:text-ink sm:inline-flex">
              동작 방식
            </a>
            <a href="#samples" className="hidden min-h-11 items-center px-3 text-sub font-medium text-ink-soft hover:text-ink sm:inline-flex">
              샘플 데이터
            </a>
            <Link href="/dashboard" className={`${btn.secondary} ml-1`}>
              대시보드 열기
            </Link>
          </nav>
        </div>
      </header>

      {/* 1. 히어로 — 약속 한 문장 + 실제 결과 미리보기 */}
      <section className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_75%_20%,rgba(20,120,255,0.10),transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 md:px-8 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-meta font-semibold text-ink-soft shadow-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {BRAND.productTagline} · {BRAND.company}
            </p>
            <h1 className="mt-6 text-display font-bold leading-[1.15] text-ink">
              데이터를 넣으면,
              <br />
              <span className="text-brand">무엇이 변했고</span>
              <br />
              무엇을 해야 하는지
              <br className="hidden sm:block" /> 알려줍니다
            </h1>
            <p className="mt-6 max-w-xl text-lead text-ink-soft">
              분석가가 없는 팀을 위한 분석 도구입니다. 대표가 아침에 한 화면만 봐도 이번 기간에 무슨 일이 있었고, 왜 그랬고, 오늘 무엇을
              확인해야 하는지 알 수 있게 만들었습니다.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <button onClick={() => startAnalysis(datasets[0])} className={`${btn.primary} min-h-12 px-6 text-body`}>
                샘플 데이터로 체험하기 <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <Link href="/data" className={`${btn.secondary} min-h-12 px-6 text-body`}>
                내 파일 올리기
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-meta text-ink-soft">
              {["회원가입 없음", "파일은 브라우저에서만 처리", "CSV · XLSX"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-positive" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* 실제 샘플 데이터로 계산한 대시보드 축소판 */}
          <figure className="relative">
            <div aria-hidden inert>
              <WindowFrame title="대시보드 · 이커머스 판매 데이터">
                {preview ? (
                  <BriefingPreview b={preview.b} trend={preview.trend} period={preview.period} />
                ) : (
                  <div className="space-y-3 p-5">
                    <div className="skeleton h-5 w-40" />
                    <div className="skeleton h-7 w-4/5" />
                    <div className="skeleton h-11 w-full" />
                    <div className="skeleton h-20 w-full" />
                  </div>
                )}
              </WindowFrame>
              {preview?.alert && (
                <div className="absolute -bottom-20 -left-8 hidden md:block">
                  <AlertCard a={preview.alert} />
                </div>
              )}
            </div>
            <figcaption className="sr-only">
              샘플 이커머스 데이터로 계산한 대시보드 미리보기 — {preview?.b.headline ?? "이번 기간 요약"}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2. 동작 방식 — 각 단계가 실제로 무엇을 보여주는지 */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-surface" aria-labelledby="how-title">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <p className="eyebrow">동작 방식</p>
          <h2 id="how-title" className="mt-2 max-w-2xl text-title font-bold text-ink md:text-[32px] md:leading-tight">
            숫자를 늘어놓는 대신, 다음 행동까지 이어지는 세 단계
          </h2>
          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.no} className="flex flex-col overflow-hidden rounded-card border border-line bg-canvas">
                <div className="h-[232px] overflow-hidden border-b border-line bg-surface-soft p-5" aria-hidden inert>
                  {i === 0 && <DiagnosisPreview />}
                  {i === 1 && preview && <ContributionPreview items={preview.split} />}
                  {i === 2 && preview?.inv && <TimelinePreview inv={preview.inv} />}
                </div>
                <div className="p-5 md:p-6">
                  <p className="tabular text-meta font-semibold text-brand">{s.no}</p>
                  <h3 className="mt-1 text-card font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sub text-ink-soft">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. 원칙 — 어두운 띠로 리듬을 바꾼다 */}
      <section className="bg-nav text-white" aria-labelledby="principles-title">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[0.9fr_2fr]">
          <div>
            <p className="text-caption font-semibold tracking-[0.04em] text-nav-dim">원칙</p>
            <h2 id="principles-title" className="mt-2 text-title font-bold md:text-[30px] md:leading-tight">
              믿고 결정할 수 있는 분석
            </h2>
          </div>
          <ul className="grid gap-6 sm:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, desc }) => (
              <li key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.08] text-brand-light">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-card font-bold">{title}</h3>
                <p className="mt-2 text-sub text-nav-text">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. 샘플 데이터 — 데이터마다 실제 추이와 이번 기간 결론 */}
      <section id="samples" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24" aria-labelledby="samples-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">샘플 데이터</p>
            <h2 id="samples-title" className="mt-2 text-title font-bold text-ink md:text-[32px] md:leading-tight">
              업종별 90일 데이터로 바로 확인해 보세요
            </h2>
          </div>
          <Link href="/data" className={btn.quiet}>
            내 파일로 하기 <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {datasets.map((ds) => (
            <SampleCard key={ds.id} ds={ds} preview={preview?.samples[ds.id] ?? null} onAnalyze={() => startAnalysis(ds)} action="이 데이터로 보기" />
          ))}
        </ul>
      </section>

      {/* 5. 마무리 — 다음 행동 */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-panel bg-brand px-6 py-10 text-white md:flex-row md:items-center md:px-10">
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-white/15 sm:flex" aria-hidden>
              <LineChart className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-title font-bold">오늘 데이터로 이번 달을 정리해 보세요</h2>
              <p className="mt-1 text-sub text-white/90">파일을 올리면 진단 → 브리핑 → 조사 → 보고서까지 한 번에 이어집니다.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href="/data"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-white px-6 text-body font-semibold text-brand shadow-subtle transition-colors hover:bg-brand-soft"
            >
              <FileText className="h-4 w-4" aria-hidden /> 내 파일 올리기
            </Link>
            <button
              onClick={() => startAnalysis(datasets[0])}
              className="inline-flex min-h-12 items-center justify-center rounded-control border border-white/40 px-6 text-body font-semibold text-white transition-colors hover:bg-white/10"
            >
              샘플로 먼저 보기
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <SampleBridgeCTA />
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center md:px-8">
          <MiraeWordmark height={36} />
          <p className="text-caption text-ink-dim">
            © {BRAND.company} · {BRAND.product} {BRAND.productTagline} 데모
          </p>
        </div>
      </footer>
    </div>
  );
}
