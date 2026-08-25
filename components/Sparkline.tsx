"use client";

/** KPI 카드용 미니 스파크라인 (SVG) */
export default function Sparkline({
  data,
  color = "#1478ff",
  width = 96,
  height = 30,
  dots = false,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  dots?: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const coords = data.map((v, i) => ({
    x: i * step,
    y: height - 3 - ((v - min) / range) * (height - 6),
  }));
  const pts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`);
  const areaPath = `M0,${height} L${pts.join(" L")} L${width},${height} Z`;
  const gid = `spark-${color.replace("#", "")}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {dots &&
        coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={1.6} fill={color} />
        ))}
    </svg>
  );
}
