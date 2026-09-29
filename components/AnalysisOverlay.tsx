"use client";

import { Check, LoaderCircle } from "lucide-react";
import { ANALYSIS_STEPS, useApp } from "@/lib/store";

/** 분석 진행 표시 — 어떤 단계를 거치는지 짧게 보여준다. */
export default function AnalysisOverlay() {
  const { analyzing, analysisStep } = useApp();
  if (!analyzing) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 px-4"
      role="alertdialog"
      aria-live="assertive"
      aria-label="데이터 분석 진행 중"
    >
      <div className="card w-full max-w-[400px] p-6 shadow-overlay">
        <p className="text-card font-bold text-ink">데이터를 분석하고 있습니다</p>
        <p className="mt-1 text-meta text-ink-dim">규칙 기반 분석 엔진 · 몇 초면 끝납니다</p>
        <ol className="mt-5 space-y-3">
          {ANALYSIS_STEPS.map((step, i) => {
            const done = i < analysisStep;
            const active = i === analysisStep;
            return (
              <li
                key={step}
                className={`flex items-center gap-3 text-body ${done ? "text-ink-soft" : active ? "font-semibold text-ink" : "text-ink-dim"}`}
              >
                {done ? (
                  <Check className="h-5 w-5 shrink-0 text-positive" aria-hidden />
                ) : active ? (
                  <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-brand" aria-hidden />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border border-line-strong" aria-hidden />
                )}
                {step}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
