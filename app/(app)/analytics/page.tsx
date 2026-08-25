"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import RevenueTrendChart, { TrendMetric } from "@/components/charts/RevenueTrendChart";
import ChartTooltip from "@/components/charts/ChartTooltip";
import MetricCard from "@/components/MetricCard";
import { useApp } from "@/lib/store";
import { computeKpis, exploreSeries, trendSeries } from "@/lib/analytics-engine";
import { formatDateKR, formatDateShort, formatKRW } from "@/lib/format";

export default function AnalyticsPage() {
  const { dataset, filters } = useApp();
  const [metric, setMetric] = useState<TrendMetric>("revenue");

  const data = useMemo(() => {
    if (!dataset) return null;
    return {
      kpis: computeKpis(dataset.rows, filters),
      trend: trendSeries(dataset.rows, filters),
      byChannel: exploreSeries(dataset.rows, filters, "revenue", "channel"),
      byProduct: exploreSeries(dataset.rows, filters, "revenue", "product"),
    };
  }, [dataset, filters]);

  if (!dataset || !data) {
    return (
      <>
        <PageHeader subtitle="지난 기간 동안 가장 큰 변화가 있었던 지표입니다" />
        <EmptyState />
      </>
    );
  }

  const convSeries = data.trend.map((p) => ({ date: p.date, conversionRate: p.conversionRate, aov: p.aov }));

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · 최근 ${filters.rangeDays}일 상세 분석`} />
      <FilterBar dataset={dataset} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {data.kpis.map((kpi, i) => (
          <MetricCard
            key={kpi.key}
            kpi={kpi}
            delay={i * 60}
            selected={metric === kpi.key}
            onSelect={() => setMetric(kpi.key as TrendMetric)}
          />
        ))}
      </div>

      <div className="mt-4">
        <RevenueTrendChart points={data.trend} metric={metric} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-hover animate-fade-up p-4 md:p-5">
          <h3 className="mb-3 text-[22.5px] font-semibold">채널별 매출</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byChannel} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#122544" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={6} />
                <YAxis tickFormatter={(v: number) => formatKRW(v).replace("₩", "")} axisLine={false} tickLine={false} width={86} />
                <Tooltip
                  cursor={{ fill: "#122544", opacity: 0.4 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip rows={[{ name: String(payload[0].payload.name), value: formatKRW(payload[0].payload.value), color: "#3b82f6" }]} />
                    ) : null
                  }
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-hover animate-fade-up p-4 md:p-5" style={{ animationDelay: "80ms" }}>
          <h3 className="mb-3 text-[22.5px] font-semibold">상품별 매출</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byProduct} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#122544" strokeDasharray="3 6" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => formatKRW(v).replace("₩", "")} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={150} />
                <Tooltip
                  cursor={{ fill: "#122544", opacity: 0.4 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip rows={[{ name: String(payload[0].payload.name), value: formatKRW(payload[0].payload.value), color: "#22d3ee" }]} />
                    ) : null
                  }
                />
                <Bar dataKey="value" fill="#22d3ee" radius={[0, 6, 6, 0]} maxBarSize={22} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 card card-hover animate-fade-up p-4 md:p-5">
        <h3 className="mb-3 text-[22.5px] font-semibold">전환율 추이</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={convSeries} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#122544" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDateShort} axisLine={false} tickLine={false} minTickGap={28} dy={6} />
              <YAxis tickFormatter={(v: number) => `${v}%`} axisLine={false} tickLine={false} width={62} domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltip
                      label={formatDateKR(String(label))}
                      rows={[{ name: "전환율", value: `${payload[0].payload.conversionRate}%`, color: "#8b5cf6" }]}
                    />
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="conversionRate"
                stroke="#8b5cf6"
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#0a1628", strokeWidth: 2 }}
                animationDuration={700}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
