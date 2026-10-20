/**
 * 아주 작은 추이선 — 숫자 옆에서 '흐름'만 보여준다(축·툴팁 없음, 장식이 아니라 요약).
 * 의미는 옆의 숫자·문장이 전달하므로 스크린리더에는 숨긴다.
 */
export default function Sparkline({
  values,
  width = 120,
  height = 32,
  color = "#1478ff",
  fill = true,
  stretch = false,
  highlight,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  /** 부모 폭에 맞춰 늘린다(선 굵기는 유지, 끝점 표시는 생략) */
  stretch?: boolean;
  /** 강조할 구간(값 위치) — 옅은 띠와 그 구간의 선을 다른 색으로 그린다 */
  highlight?: { from: number; to: number; color: string };
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `spark-${Math.round(values[0])}-${values.length}-${color.replace("#", "")}`;
  const [lx, ly] = pts[pts.length - 1];
  const step = width / (values.length - 1);
  const hl = highlight && {
    ...highlight,
    x: Math.max(0, highlight.from * step - step / 2),
    w: Math.min(width, highlight.to * step + step / 2) - Math.max(0, highlight.from * step - step / 2),
    path: pts
      .slice(Math.max(0, highlight.from - 1), Math.min(pts.length, highlight.to + 2))
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" "),
  };
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? "none" : undefined}
      className={`overflow-visible ${className}`}
      aria-hidden
      focusable="false"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      )}
      {hl && <rect x={hl.x} y={0} width={Math.max(hl.w, 2)} height={height} fill={hl.color} opacity={0.12} rx={2} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect={stretch ? "non-scaling-stroke" : undefined}
      />
      {hl && (
        <path
          d={hl.path}
          fill="none"
          stroke={hl.color}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect={stretch ? "non-scaling-stroke" : undefined}
        />
      )}
      {!stretch && !hl && <circle cx={lx} cy={ly} r={2.5} fill={color} stroke="#fff" strokeWidth={1.5} />}
    </svg>
  );
}
