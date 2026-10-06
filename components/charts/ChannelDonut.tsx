"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChannelShare } from "@/lib/types";
import { formatKRW } from "@/lib/format";
import { chartColors } from "@/lib/palette";
import ChartTooltip from "./ChartTooltip";

/**
 * 채널별 매출 비중 — 목록의 채널을 누르면 그 채널로 범위가 좁혀진다(드릴다운).
 * 다시 누르면 전체 채널로 돌아간다.
 */
export default function ChannelDonut({
  shares,
  active = "all",
  onSelect,
}: {
  shares: ChannelShare[];
  active?: string;
  onSelect?: (channel: string) => void;
}) {
  const colors = chartColors(shares.length);
  const total = shares.reduce((a, s) => a + s.revenue, 0);

  return (
    <div className="@container px-5 pb-5 pt-4 md:px-6">
    <div className="flex flex-col items-center gap-4 @[440px]:flex-row">
      {/* 같은 값이 옆 목록에 글자로 있으므로 그림은 보조 기술에서 숨긴다 */}
      <div className="relative h-[168px] w-[168px] shrink-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Tooltip
              content={({ active: on, payload }) => {
                if (!on || !payload?.length) return null;
                const s = payload[0].payload as ChannelShare;
                return (
                  <ChartTooltip
                    rows={[{ name: s.channel, value: `${formatKRW(s.revenue)} (${s.share}%)`, color: colors[shares.indexOf(s)] }]}
                  />
                );
              }}
            />
            <Pie
              data={shares}
              dataKey="revenue"
              nameKey="channel"
              rootTabIndex={-1}
              innerRadius={56}
              outerRadius={80}
              paddingAngle={1.5}
              stroke="#ffffff"
              strokeWidth={2}
              animationDuration={500}
            >
              {shares.map((s, i) => (
                <Cell key={s.channel} fill={colors[i]} opacity={active === "all" || active === s.channel ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-caption text-ink-dim">합계</span>
          <span className="tabular text-body font-bold text-ink">{formatKRW(total)}</span>
        </div>
      </div>
      <ul className="w-full flex-1">
        {shares.map((s, i) => {
          const on = active === s.channel;
          const row = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i] }} aria-hidden />
              <span className={`flex-1 truncate ${on ? "font-semibold text-brand" : "text-ink-soft"}`}>{s.channel}</span>
              <span className="tabular font-semibold text-ink">{s.share.toFixed(1)}%</span>
              <span className={`tabular w-16 text-right text-meta ${s.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                {s.changePct >= 0 ? "+" : ""}
                {s.changePct.toFixed(1)}%p
              </span>
            </>
          );
          return (
            <li key={s.channel}>
              {onSelect ? (
                <button
                  onClick={() => onSelect(on ? "all" : s.channel)}
                  aria-pressed={on}
                  className="flex min-h-11 w-full items-center gap-3 rounded-control px-2 text-left text-sub transition-colors hover:bg-surface-soft"
                >
                  {row}
                </button>
              ) : (
                <div className="flex min-h-11 items-center gap-3 px-2 text-sub">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
    </div>
  );
}
