"use client";

import { useEffect, useState } from "react";

const DATE_FMT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const TIME_FMT = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * 오늘 날짜(요일 포함)와 실시간 시각(초 단위).
 * 서버 렌더 결과와 어긋나지 않도록 마운트 이후에만 값을 표시한다.
 */
export default function LiveClock({
  variant = "bar",
  className = "",
}: {
  /** bar = 데스크톱 툴바(가로), stack = 모바일(세로) */
  variant?: "bar" | "stack";
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = now ? DATE_FMT.format(now) : "";
  const time = now ? TIME_FMT.format(now) : "";

  if (variant === "stack") {
    return (
      <div className={className} suppressHydrationWarning>
        <p className="text-[16px] font-medium text-ink-soft">{date || " "}</p>
        <p className="tabular text-[24px] font-bold leading-tight tracking-tight text-ink">
          {time || " "}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`} suppressHydrationWarning>
      <span className="whitespace-nowrap text-[16px] font-medium text-ink-soft">
        {date || " "}
      </span>
      <span className="tabular whitespace-nowrap text-[19px] font-bold text-ink">
        {time || " "}
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold text-mint">
        <span className="h-2 w-2 rounded-full bg-mint" />
        LIVE
      </span>
    </div>
  );
}

/** 모바일 헤더용 — 시각(초 단위)만 표시 */
export function LiveTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return <>{now ? TIME_FMT.format(now) : ""}</>;
}
