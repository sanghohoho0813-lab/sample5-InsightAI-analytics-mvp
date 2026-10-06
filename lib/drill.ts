"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApp } from "./store";
import { ALL_NAV } from "./nav";
import { MetricKey } from "./types";

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 인사이트·이상치에서 분석 화면으로 들어가는 공통 동작.
 * 출발한 화면과 그때의 범위를 기억해 두었다가, 돌아가면 원래 범위로 되돌린다.
 */
export function useDrill() {
  const router = useRouter();
  const pathname = usePathname();
  const { setFilters, setCustomRange, beginDrill } = useApp();
  const fromLabel = ALL_NAV.find((n) => n.href === pathname)?.label ?? "이전 화면";

  const toSegment = useCallback(
    (target: { channel?: string; product?: string; metric?: MetricKey }, label?: string) => {
      beginDrill({ from: pathname, fromLabel, label: label ?? `${target.channel ?? target.product ?? "선택 항목"}` });
      setFilters({ channel: target.channel ?? "all", product: target.product ?? "all" });
      router.push(`/analytics?metric=${target.metric ?? "revenue"}`);
    },
    [router, setFilters, beginDrill, pathname, fromLabel]
  );

  /** 이상치 발생일 전 7일 ~ 후 3일로 기간을 좁히고, 원인 채널이 있으면 함께 건다. */
  const toMoment = useCallback(
    (date: string, channel?: string, metric: MetricKey = "revenue", label?: string) => {
      beginDrill({ from: pathname, fromLabel, label: label ?? "선택한 변화", date });
      setCustomRange(shiftDate(date, -7), shiftDate(date, 3));
      setFilters({ channel: channel ?? "all", product: "all" });
      router.push(`/analytics?metric=${metric}`);
    },
    [router, setCustomRange, setFilters, beginDrill, pathname, fromLabel]
  );

  return { toSegment, toMoment };
}
