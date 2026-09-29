"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApp } from "./store";
import { MetricKey } from "./types";

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 인사이트·이상치에서 '관련 데이터 보기'로 분석 화면에 들어가는 공통 동작 */
export function useDrill() {
  const router = useRouter();
  const { setFilters, setCustomRange } = useApp();

  const toSegment = useCallback(
    (target: { channel?: string; product?: string; metric?: MetricKey }) => {
      setFilters({ channel: target.channel ?? "all", product: target.product ?? "all" });
      router.push(`/analytics?metric=${target.metric ?? "revenue"}`);
    },
    [router, setFilters]
  );

  /** 이상치 발생일 전 7일 ~ 후 3일로 기간을 좁히고, 원인 채널이 있으면 함께 건다. */
  const toMoment = useCallback(
    (date: string, channel?: string, metric: MetricKey = "revenue") => {
      setCustomRange(shiftDate(date, -7), shiftDate(date, 3));
      setFilters({ channel: channel ?? "all", product: "all" });
      router.push(`/analytics?metric=${metric}`);
    },
    [router, setCustomRange, setFilters]
  );

  return { toSegment, toMoment };
}
