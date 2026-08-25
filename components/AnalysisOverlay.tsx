"use client";

import { ANALYSIS_STEPS, useApp } from "@/lib/store";
import { Check, LoaderCircle, Sparkles } from "lucide-react";

/** 분석 시작 시 표시되는 단계별 로딩 오버레이 (AI 분석 과정 연출) */
export default function AnalysisOverlay() {
  const { analyzing, analysisStep } = useApp();
  if (!analyzing) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/85 backdrop-blur-sm animate-fade-in">
      <div className="card w-[min(420px,90vw)] p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <Sparkles className="h-5 w-5 text-accent-bright" />
          </div>
          <div>
            <p className="font-semibold">AI 분석 진행 중</p>
            <p className="text-xs text-ink-soft">데이터에서 중요한 변화만 찾아드립니다.</p>
          </div>
        </div>
        <ul className="space-y-3">
          {ANALYSIS_STEPS.map((step, i) => {
            const done = i < analysisStep;
            const active = i === analysisStep;
            return (
              <li
                key={step}
                className={`flex items-center gap-3 text-sm transition-colors duration-300 ${
                  done ? "text-ink-soft" : active ? "text-ink" : "text-ink-dim"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-positive" />
                ) : active ? (
                  <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-accent-bright" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line-strong" />
                )}
                {step}
              </li>
            );
          })}
        </ul>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-navy-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-accent transition-all duration-700"
            style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
