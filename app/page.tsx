"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, BrainCircuit, LineChart, Sparkles, TrendingUp, Upload } from "lucide-react";
import Logo from "@/components/Logo";
import { getDemoDatasets } from "@/lib/demo-data";
import { useApp } from "@/lib/store";

const FEATURES = [
  { icon: BrainCircuit, title: "AI 인사이트", desc: "숫자 대신, 무엇이 변했고 왜 변했는지 요약해 알려드립니다." },
  { icon: AlertTriangle, title: "이상징후 감지", desc: "급감·급증 같은 비정상 변화를 자동으로 찾아 알려드립니다." },
  { icon: TrendingUp, title: "AI 예측", desc: "다음 7일의 매출·주문·고객 변화를 미리 확인하세요." },
  { icon: LineChart, title: "실행 제안", desc: "분석에서 끝나지 않고, 다음에 할 행동까지 제안합니다." },
];

export default function Home() {
  const { startAnalysis } = useApp();
  const datasets = getDemoDatasets();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* 은은한 배경 그라데이션 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#e8f0ff] via-[#f4f7fc] to-transparent" />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link
          href="/dashboard"
          className="rounded-[10px] border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          대시보드
        </Link>
      </header>

      <section className="relative mx-auto max-w-5xl px-5 pb-16 pt-10 text-center md:pt-16">
        <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-brand">
          <Sparkles className="h-3.5 w-3.5" />
          AI 데이터 분석 · 예측 SaaS
        </span>
        <h1
          className="animate-fade-up mx-auto mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink md:text-[44px] md:leading-[1.2]"
          style={{ animationDelay: "80ms" }}
        >
          데이터에서 <span className="text-brand">중요한 변화</span>만
          <br />
          찾아드립니다
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-soft"
          style={{ animationDelay: "160ms" }}
        >
          데이터를 업로드하면 AI가 핵심 KPI, 이상징후, 다음 7일 예측, 그리고
          지금 해야 할 행동까지 한 번에 정리해드립니다. 데이터 분석가가 없어도 됩니다.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <button
            onClick={() => startAnalysis(datasets[0])}
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[14.5px] font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:scale-[1.02] hover:bg-brand-dark"
          >
            <Sparkles className="h-[18px] w-[18px]" />
            샘플 데이터 분석해보기
          </button>
          <Link
            href="/data"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-[14.5px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Upload className="h-[18px] w-[18px]" />
            내 데이터 업로드
          </Link>
        </div>
        <p className="animate-fade-up mt-3 text-[12px] text-ink-dim" style={{ animationDelay: "300ms" }}>
          회원가입 없이 20초 안에 체험할 수 있습니다
        </p>
      </section>

      <section className="relative mx-auto grid max-w-5xl grid-cols-1 gap-3.5 px-5 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <div key={f.title} className="card card-hover animate-fade-up p-5" style={{ animationDelay: `${320 + i * 70}ms` }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
              <f.icon className="h-5 w-5 text-brand" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-ink">{f.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="relative mx-auto max-w-5xl px-5 pb-20">
        <h2 className="mb-4 text-center text-lg font-bold text-ink">샘플 데이터로 시작하기</h2>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {datasets.map((ds, i) => (
            <button
              key={ds.id}
              onClick={() => startAnalysis(ds)}
              className="card card-hover group animate-fade-up p-5 text-left"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
                {ds.category}
              </span>
              <p className="mt-2.5 text-[14.5px] font-semibold text-ink">{ds.name}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{ds.description}</p>
              <span className="mt-3 flex items-center gap-1 text-[12.5px] font-semibold text-brand">
                분석 시작 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
