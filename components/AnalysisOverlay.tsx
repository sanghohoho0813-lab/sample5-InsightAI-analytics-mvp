"use client";

import { ANALYSIS_STEPS, useApp } from "@/lib/store";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { MiraeLockup } from "./MiraeLogo";

/** 분석 시작 시 표시되는 단계별 로딩 오버레이 (AI 분석 과정 연출) */
export default function AnalysisOverlay() {
  const { analyzing, analysisStep } = useApp();
  if (!analyzing) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-ink/25 backdrop-blur-sm">
      <div className="card w-[min(420px,90vw)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft">
            <Sparkles className="h-7 w-7 text-brand" />
          </div>
          <div>
            <p className="font-bold text-ink">AI 분석 진행 중</p>
            <p className="text-[18px] text-ink-soft">데이터에서 중요한 변화만 찾아드립니다.</p>
          </div>
        </div>
        <ul className="space-y-3">
          {ANALYSIS_STEPS.map((step, i) => {
            const done = i < analysisStep;
            const active = i === analysisStep;
            return (
              <li
                key={step}
                className={`flex items-center gap-3 text-[21px] transition-colors duration-300 ${
                  done ? "text-ink-soft" : active ? "font-medium text-ink" : "text-ink-dim"
                }`}
              >
                {done ? (
                  <Check className="h-6 w-6 shrink-0 text-positive" />
                ) : active ? (
                  <LoaderCircle className="h-6 w-6 shrink-0 animate-spin text-brand" />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full border border-line-strong" />
                )}
                {step}
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex justify-center border-t border-line pt-4">
          <MiraeLockup size="md" />
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-all duration-700"
            style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
