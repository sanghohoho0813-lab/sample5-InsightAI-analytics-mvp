"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChannelShare } from "@/lib/types";
import { formatKRW } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

export const DONUT_COLORS = ["#3b82f6", "#22d3ee", "#8b5cf6", "#475569", "#f59e0b", "#34d399"];

/** 채널별 매출 비중 도넛 차트 + 중앙 총매출 표시 */
export default function ChannelDonut({ shares }: { shares: ChannelShare[] }) {
  const total = shares.reduce((a, s) => a + s.revenue, 0);

  return (
    <div className="card card-hover animate-fade-up flex h-full flex-col p-4 md:p-5" style={{ animationDelay: "80ms" }}>
      <h3 className="text-[15px] font-semibold">채널별 매출 비중</h3>
      <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:gap-4">
        <div className="relative h-[190px] w-[190px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const s = payload[0].payload as ChannelShare;
                  return (
                    <ChartTooltip
                      rows={[{
                        name: s.channel,
                        value: `${formatKRW(s.revenue)} (${s.share}%)`,
                        color: DONUT_COLORS[shares.indexOf(s) % DONUT_COLORS.length],
                      }]}
                    />
                  );
                }}
              />
              <Pie
                data={shares}
                dataKey="revenue"
                nameKey="channel"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={3}
                cornerRadius={5}
                stroke="none"
                animationDuration={800}
              >
                {shares.map((s, i) => (
                  <Cell key={s.channel} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] text-ink-dim">총 매출</span>
            <span className="text-[17px] font-bold">{formatKRW(total)}</span>
          </div>
        </div>
        <ul className="w-full flex-1 space-y-2.5 pb-1">
          {shares.map((s, i) => (
            <li key={s.channel} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="flex-1 truncate text-ink-soft">{s.channel}</span>
              <span className="tabular font-semibold">{s.share.toFixed(1)}%</span>
              <span className={`tabular w-14 text-right text-[11px] ${s.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%p
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
