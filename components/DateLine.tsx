"use client";

import { useEffect, useState } from "react";

const DATE_FMT = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" });
const TIME_FMT = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
const FULL_FMT = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full", timeStyle: "medium" });

/**
 * 오늘 날짜 · 요일 · 현재 시각(분 단위).
 * 서버 렌더와 어긋나지 않도록 마운트 이후에만 표시하고, 분이 바뀔 때만 갱신한다.
 */
export default function DateLine({ className = "", showTime = true }: { className?: string; showTime?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    let interval: ReturnType<typeof setInterval> | undefined;
    // 다음 정각 분에 맞춰 1분 간격으로 갱신
    const align = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!now) return <span className={className} aria-hidden>&nbsp;</span>;
  return (
    <time dateTime={now.toISOString()} title={FULL_FMT.format(now)} className={`tabular whitespace-nowrap ${className}`}>
      {DATE_FMT.format(now)}
      {showTime && <span className="ml-2 text-ink-soft">{TIME_FMT.format(now)}</span>}
    </time>
  );
}
