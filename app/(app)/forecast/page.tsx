"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ForecastCard from "@/components/ForecastCard";
import ForecastChart from "@/components/charts/ForecastChart";
import { filterDimensions } from "@/lib/analytics-engine";
import { useApp } from "@/lib/store";
import { computeForecasts } from "@/lib/forecast-engine";

export default function ForecastPage() {
  const { dataset, filters } = useApp();
  const [active, setActive] = useState<"revenue" | "orders" | "customers">("revenue");

  const forecasts = useMemo(
    () => (dataset ? computeForecasts(filterDimensions(dataset.rows, filters)) : []),
    [dataset, filters]
  );

  if (!dataset) {
    return (
      <>
        <PageHeader subtitle="다음 7일의 변화를 미리 확인하세요" />
        <EmptyState />
      </>
    );
  }

  const current = forecasts.find((f) => f.key === active)!;

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · 다음 7일의 변화를 미리 확인하세요`} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {forecasts.map((f, i) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`rounded-2xl text-left transition-all duration-200 ${
              active === f.key ? "ring-2 ring-brand/40" : ""
            }`}
          >
            <ForecastCard summary={f} delay={i * 70} />
          </button>
        ))}
      </div>

      <div className="card card-hover mt-4 animate-fade-up p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold">{current.label} · 다음 7일</h3>
            <div className="mt-1 flex items-center gap-3 text-[11.5px] text-ink-dim">
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-brand" /> 실측</span>
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-aqua" /> AI Forecast</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-aqua/15" /> 예상 범위</span>
            </div>
          </div>
        </div>
        <ForecastChart summary={current} height={320} />
      </div>

      <div className="card mt-4 flex items-start gap-3 p-4 text-[12px] leading-relaxed text-ink-dim animate-fade-up">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          예상 수치는 최근 14일 이동평균과 성장률을 반영한 추정치입니다. 실제 결과는
          프로모션, 시즌 요인 등에 따라 달라질 수 있으며, 예상 범위는 최근 변동성을 기준으로 계산됩니다.
        </p>
      </div>
    </>
  );
}
