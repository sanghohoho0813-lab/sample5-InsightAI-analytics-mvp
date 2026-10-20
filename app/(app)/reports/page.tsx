"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUp, FileText, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import FilterToolbar from "@/components/FilterToolbar";
import { Panel, PanelHeader } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { findDataset } from "@/lib/persist";
import { BRAND } from "@/lib/brand";
import { reportSignature, scopeLabel, scopeOf, summarize } from "@/lib/report";
import { formatDateKR, formatKRW, formatNumber, formatValue } from "@/lib/format";
import { SavedReport } from "@/lib/types";
import { SEVERITY_META, btn, field } from "@/lib/ui";
import { PRIORITY } from "@/components/BriefingPanel";

const DATETIME = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

const SECTIONS = [
  { id: "r-summary", label: "핵심 요약" },
  { id: "r-scope", label: "분석 범위" },
  { id: "r-findings", label: "주요 발견" },
  { id: "r-risks", label: "위험 요소" },
  { id: "r-actions", label: "권장 행동" },
  { id: "r-meta", label: "생성 시점" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const jumpTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  // 화면 낭독기도 같은 위치에서 이어 읽도록 제목으로 초점을 옮긴다.
  el.focus({ preventScroll: true });
};

/**
 * 넓은 화면의 보고서 목차 — 지금 읽는 절을 표시하고, 누르면 그 절로 이동한다.
 * 절마다 건수를 붙여 위험·행동이 몇 개인지 펼치기 전에 보이게 한다.
 */
function ReportToc({ counts }: { counts: Partial<Record<SectionId, { n: number; tone?: "negative" }>> }) {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      let current: SectionId = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) current = id;
      }
      setActive(bottom ? SECTIONS[SECTIONS.length - 1].id : current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav aria-label="보고서 목차" className="sticky top-[92px]">
      <p className="eyebrow">목차</p>
      <ol className="mt-3 space-y-0.5 border-l border-line">
        {SECTIONS.map((s, i) => {
          const on = active === s.id;
          const c = counts[s.id];
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(s.id);
                  jumpTo(s.id);
                }}
                aria-current={on ? "location" : undefined}
                className={`-ml-px flex min-h-9 items-center gap-2 border-l-2 py-1.5 pl-3.5 pr-1 text-meta transition-colors ${
                  on ? "border-brand font-semibold text-ink" : "border-transparent text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                <span className={`tabular w-3 shrink-0 ${on ? "text-brand" : "text-ink-dim"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">{s.label}</span>
                {c && c.n > 0 && (
                  <span
                    className={`tabular rounded-full px-1.5 text-caption font-semibold ${
                      c.tone === "negative" ? "bg-negative-soft text-negative" : "bg-surface-soft text-ink-soft"
                    }`}
                  >
                    {c.n}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
        className="mt-4 inline-flex min-h-9 items-center gap-1.5 pl-4 text-meta font-semibold text-ink-dim transition-colors hover:text-ink"
      >
        <ArrowUp className="h-3.5 w-3.5" aria-hidden /> 맨 위로
      </button>
    </nav>
  );
}

function ReportDetail({ report }: { report: SavedReport }) {
  const router = useRouter();
  const { dataset, deleteReport, renameReport, showToast, switchDataset, setCustomRange, setFilters } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report.title);
  const source = findDataset(report.datasetId);

  const section = "border-t border-line px-5 py-7 md:px-12 md:py-9";
  // 목차에서 이동해 올 때 상단 막대에 가리지 않게 여백을 두고, 초점을 받을 수 있게 한다.
  const h = "scroll-mt-24 text-card font-bold text-ink outline-none md:text-[20px]";
  // 위험 요소는 '위험' 섹션에, 나머지 발견은 '주요 발견'에 — 같은 내용을 두 번 쓰지 않는다.
  const risks = report.findings.filter((f) => f.impact === "negative");
  const findings = report.findings.filter((f) => f.impact !== "negative");

  const saveTitle = () => {
    const t = draft.trim();
    if (!t) return;
    if (t !== report.title) {
      renameReport(report.id, t);
      showToast("제목을 바꿨습니다.", "success");
    }
    setEditing(false);
  };

  // 보고서를 만든 범위 그대로 대시보드를 다시 연다.
  const openScope = () => {
    if (!source) return;
    if (dataset?.id !== source.id) switchDataset(source);
    setCustomRange(report.scope.start, report.scope.end);
    setFilters({ channel: report.scope.channel, product: report.scope.product });
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-[920px] xl:grid xl:max-w-[1136px] xl:grid-cols-[minmax(0,1fr)_176px] xl:gap-10">
      <div className="min-w-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/reports" className="inline-flex min-h-11 items-center gap-1 text-sub font-semibold text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> 보고서 목록
        </Link>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          {source && (
            <button onClick={openScope} className={btn.secondary}>
              이 범위로 대시보드 열기
            </button>
          )}
          <button
            onClick={() => {
              showToast("인쇄 창에서 '대상 → PDF로 저장'을 선택하세요.", "info");
              setTimeout(() => window.print(), 300);
            }}
            className={btn.primary}
          >
            PDF로 저장
          </button>
        </div>
      </div>

      <Panel as="article" className="overflow-hidden shadow-raised" aria-label="보고서 본문">
        {/* 문서 머리 — 제목 · 범위 · 언제 어떤 데이터로 만든 기록인지 */}
        <header className="relative border-b border-line px-5 pb-7 pt-8 md:px-12 md:pb-9 md:pt-11">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" aria-hidden />
          <p className="eyebrow">분석 보고서 · {BRAND.product}</p>
          <div className="mt-2">
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveTitle();
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <label htmlFor="rename" className="sr-only">
                  보고서 제목
                </label>
                <input
                  id="rename"
                  autoFocus
                  value={draft}
                  maxLength={60}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (setDraft(report.title), setEditing(false))}
                  className={`${field} h-12 w-full text-lead font-semibold sm:flex-1`}
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={!draft.trim()} className={btn.primary}>
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(report.title);
                      setEditing(false);
                    }}
                    className={btn.secondary}
                  >
                    취소
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-1">
                <h1 className="min-w-0 text-page font-bold text-ink">{report.title}</h1>
                <button
                  onClick={() => setEditing(true)}
                  className="no-print mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-dim hover:bg-surface-soft hover:text-ink"
                  aria-label="제목 수정"
                  title="제목 수정"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
          <p className="mt-2 text-body text-ink-soft">
            {report.title.includes(report.datasetName) ? "" : `${report.datasetName} · `}
            {scopeLabel(report.scope)}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-meta sm:grid-cols-4">
            <div>
              <dt className="text-caption text-ink-dim">저장</dt>
              <dd className="tabular mt-0.5 font-semibold text-ink">{DATETIME.format(new Date(report.createdAt))}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-dim">비교 기준</dt>
              <dd className="mt-0.5 font-semibold text-ink">{report.comparison?.split(" · ")[1] ?? "이전 같은 기간"}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-dim">데이터</dt>
              <dd className="mt-0.5 font-semibold text-ink">{report.data?.source === "upload" ? "업로드 데이터" : "샘플 데이터"}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-dim">분석 방식</dt>
              <dd className="mt-0.5 font-semibold text-ink">규칙 기반 계산</dd>
            </div>
          </dl>
        </header>

        {/* 1. 핵심 요약 */}
        <section className="px-5 py-7 md:px-12 md:py-9" aria-labelledby="r-summary">
          <h2 id="r-summary" tabIndex={-1} className={h}>
            <span className="tabular text-brand">1.</span> 핵심 요약
          </h2>
          <p className="mt-4 text-title font-bold leading-snug text-ink md:text-[26px]">{report.headline}</p>
          {report.brief && (
            <dl className="mt-5 grid gap-5 md:grid-cols-3">
              {(
                [
                  ["가장 큰 변화", report.brief.change],
                  ["가능성 높은 원인(추정)", report.brief.cause],
                  ["지금 확인할 위험", report.brief.risk],
                ] as const
              ).map(([label, p]) => (
                <div key={label} className="border-t-2 border-line pt-3">
                  <dt className="text-caption font-semibold text-ink-dim">{label}</dt>
                  <dd className="mt-1 text-body font-semibold text-ink">{p?.title ?? "해당 없음"}</dd>
                  {p && <dd className="mt-1 text-sub text-ink-soft">{p.body}</dd>}
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* 2. 분석 범위 */}
        <section className={section} aria-labelledby="r-scope">
          <h2 id="r-scope" tabIndex={-1} className={h}>
            <span className="tabular text-brand">2.</span> 분석 범위
          </h2>
          <dl className="mt-3 grid gap-x-8 gap-y-3 text-sub sm:grid-cols-2">
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-ink-dim">기간</dt>
              <dd className="text-ink">
                {formatDateKR(report.scope.start)} ~ {formatDateKR(report.scope.end)} ({report.scope.days}일)
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-ink-dim">비교 기준</dt>
              <dd className="text-ink">{report.comparison?.split(" · ")[1] ?? (report.kpis[0]?.comparable === false ? "비교할 이전 기간 없음" : "이전 같은 기간")}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-ink-dim">대상</dt>
              <dd className="text-ink">
                {report.scope.channel === "all" ? "전체 채널" : report.scope.channel} · {report.scope.product === "all" ? "전체 상품" : report.scope.product}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-ink-dim">데이터</dt>
              <dd className="text-ink">
                {report.datasetName}
                {report.data && (
                  <span className="text-ink-soft">
                    {" "}
                    · {report.data.rows.toLocaleString("ko-KR")}행 · {report.data.days}일치 · 마지막 날짜 {formatDateKR(report.data.lastDate)}
                  </span>
                )}
              </dd>
            </div>
            {report.data && report.data.estimated.length > 0 && (
              <div className="flex gap-3 sm:col-span-2">
                <dt className="w-20 shrink-0 text-ink-dim">제외한 지표</dt>
                <dd className="text-ink-soft">{report.data.estimated.join(", ")} 열이 없어 관련 지표는 계산하지 않았습니다.</dd>
              </div>
            )}
          </dl>
        </section>

        {/* 3. 주요 발견 */}
        <section className={section} aria-labelledby="r-findings">
          <h2 id="r-findings" tabIndex={-1} className={h}>
            <span className="tabular text-brand">3.</span> 주요 발견
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sub">
              <caption className="sr-only">지표 변화</caption>
              <thead>
                <tr className="whitespace-nowrap border-b border-line text-left text-caption text-ink-dim">
                  <th className="py-2 font-semibold">지표</th>
                  <th className="py-2 text-right font-semibold">이번 기간</th>
                  <th className="hidden py-2 text-right font-semibold sm:table-cell">이전 기간</th>
                  <th className="py-2 text-right font-semibold">변화</th>
                </tr>
              </thead>
              <tbody>
                {report.kpis.map((k) => (
                  <tr key={k.key} className="border-b border-line/70 last:border-0">
                    <td className="py-3 text-ink">{k.label}</td>
                    <td className="tabular py-3 text-right font-semibold text-ink">{formatValue(k.value, k.format)}</td>
                    <td className="tabular hidden py-3 text-right text-ink-soft sm:table-cell">{k.comparable === false ? "–" : formatValue(k.prevValue, k.format)}</td>
                    {k.comparable === false ? (
                      <td className="py-3 text-right text-ink-dim">–</td>
                    ) : (
                      <td className={`tabular py-3 text-right font-semibold ${k.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                        {k.changePct >= 0 ? "+" : ""}
                        {k.changePct.toFixed(k.key === "conversion" ? 2 : 1)}
                        {k.key === "conversion" ? "%p" : "%"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {findings.length === 0 ? (
            <p className="mt-4 text-sub text-ink-soft">이 범위에서는 근거를 들어 말할 만한 변화가 없었습니다.</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {findings.map((f, i) => (
                <li key={i}>
                  <p className="text-body font-semibold text-ink">
                    {i + 1}) {f.title}
                  </p>
                  <p className="mt-1 text-sub text-ink-soft">{f.description}</p>
                  {f.evidence && f.evidence.length > 0 && (
                    <p className="tabular mt-1 text-meta text-ink-dim">근거 · {f.evidence.join(" / ")}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
          {report.forecasts.length > 0 && (
            <div className="mt-6 rounded-control bg-surface-soft px-4 py-4">
              <h3 className="text-sub font-semibold text-ink">다음 7일 전망 <span className="font-normal text-ink-dim">· 최근 추세 기반 추정치</span></h3>
              <dl className="mt-2 grid gap-3 sm:grid-cols-3">
                {report.forecasts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-meta text-ink-soft">{f.label}</dt>
                    <dd className="tabular mt-0.5 text-body font-bold text-ink">
                      {f.format === "currency" ? formatKRW(f.next7Total) : formatNumber(f.next7Total)}{" "}
                      <span className={`text-meta font-semibold ${f.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                        직전 7일 대비 {f.changePct >= 0 ? "+" : ""}
                        {f.changePct.toFixed(1)}%
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>

        {/* 4. 위험 요소 */}
        <section className={section} aria-labelledby="r-risks">
          <h2 id="r-risks" tabIndex={-1} className={h}>
            <span className="tabular text-brand">4.</span> 위험 요소
          </h2>
          {risks.length === 0 && report.anomalies.length === 0 ? (
            <p className="mt-3 text-sub text-ink-soft">저장 시점에 확인이 필요한 위험 신호는 없었습니다.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {risks.map((f, i) => (
                <li key={`f${i}`}>
                  <p className="text-body font-semibold text-ink">{f.title}</p>
                  <p className="mt-1 text-sub text-ink-soft">{f.description}</p>
                </li>
              ))}
              {report.anomalies.map((a, i) => (
                <li key={`a${i}`} className="text-sub text-ink-soft">
                  <p className="text-body font-semibold text-ink">
                    <span className={SEVERITY_META[a.severity].text}>[{SEVERITY_META[a.severity].label}]</span> {a.title}
                  </p>
                  <p className="mt-1">
                    {formatDateKR(a.date)}
                    {a.days && a.days > 1 ? `부터 ${a.days}일간` : ""}
                    {a.ongoing ? " · 저장 시점에 진행 중" : ""} — {a.description}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 5. 권장 행동 */}
        <section className={section} aria-labelledby="r-actions">
          <h2 id="r-actions" tabIndex={-1} className={h}>
            <span className="tabular text-brand">5.</span> 권장 행동
          </h2>
          {report.recommendations.length === 0 ? (
            <p className="mt-3 text-sub text-ink-soft">근거를 들어 제안할 행동이 없었습니다.</p>
          ) : (
            <ol className="mt-3 space-y-4">
              {report.recommendations.map((r, i) => (
                <li key={i}>
                  <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                    {i + 1}) {r.title}
                    <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${PRIORITY[r.priority].cls}`}>{PRIORITY[r.priority].label}</span>
                  </p>
                  <p className="mt-1 text-sub text-ink-soft">{r.description}</p>
                  {r.evidence ? (
                    <p className="mt-1 text-meta text-ink-dim">근거 · {r.evidence}</p>
                  ) : r.expectedEffect ? (
                    <p className="mt-1 text-meta text-ink-dim">예상 효과(추정) {r.expectedEffect}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 6. 생성 시점 */}
        <section className={`${section} bg-surface-soft`} aria-labelledby="r-meta">
          <h2 id="r-meta" tabIndex={-1} className={h}>
            <span className="tabular text-brand">6.</span> 생성 시점
          </h2>
          <p className="mt-2 text-sub text-ink">
            {DATETIME.format(new Date(report.createdAt))} · 작성 {BRAND.user.display}
          </p>
          <p className="mt-1 text-meta text-ink-dim">
            이 보고서는 저장한 순간의 계산 결과입니다. 이후 데이터가 바뀌어도 내용은 그대로 남습니다.
            {source ? " 지금 데이터로 다시 보려면 '이 범위로 대시보드 열기'를 누르세요." : " 원본 데이터가 이 브라우저에 없어 다시 열 수는 없습니다."}
          </p>
        </section>
      </Panel>

      <div className="no-print mt-4 flex justify-end">
        <button
          onClick={() => {
            deleteReport(report.id);
            router.push("/reports");
          }}
          className="inline-flex min-h-11 items-center gap-1 px-2 text-sub font-semibold text-ink-dim transition-colors hover:text-negative"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> 이 보고서 삭제
        </button>
      </div>
      </div>

      <aside className="no-print hidden xl:block xl:pt-[60px]">
        <ReportToc
          counts={{
            "r-findings": { n: findings.length },
            "r-risks": { n: risks.length + report.anomalies.length, tone: "negative" },
            "r-actions": { n: report.recommendations.length },
          }}
        />
      </aside>
    </div>
  );
}

function ReportLibrary() {
  const router = useRouter();
  const { dataset, filters, reports, saveReport } = useApp();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const scope = useMemo(() => (dataset ? scopeOf(dataset, filters) : null), [dataset, filters]);
  const preview = useMemo(() => (dataset ? summarize(dataset, filters) : null), [dataset, filters]);
  const existing = dataset ? reports.find((r) => r.signature === reportSignature(dataset, filters)) : undefined;

  const create = () => {
    setBusy(true);
    // 계산은 즉시 끝나지만 저장 중임을 인지할 수 있게 짧게 멈춘다.
    setTimeout(() => {
      const r = saveReport(title);
      setBusy(false);
      setTitle("");
      if (r) router.push(`/reports?id=${r.id}`);
    }, 400);
  };

  return (
    <>
      <PageHeader title="보고서" description="특정 시점의 분석 결론을 업무 기록으로 남기고, 다시 열거나 PDF로 공유합니다" />

      {dataset && scope ? (
        <>
        <FilterToolbar dataset={dataset} />
        <Panel className="p-5 md:p-6" aria-labelledby="new-report">
          <h2 id="new-report" className="text-card font-bold text-ink">
            새 보고서
          </h2>
          <p className="mt-1 text-sub text-ink-soft">
            <b className="font-semibold text-ink">{dataset.name}</b> · {scopeLabel(scope)}
          </p>
          {preview && (
            <div className="mt-4 rounded-control border border-line bg-surface-soft px-4 py-3">
              <p className="text-caption font-semibold text-ink-dim">이 결론이 기록됩니다</p>
              <p className="mt-1 text-body font-semibold text-ink">{preview.headline}</p>
              <p className="mt-1 text-meta text-ink-soft">
                {[preview.change?.title, preview.risk ? `위험: ${preview.risk.title}` : null, `권장 행동 ${preview.actions.length}건`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="report-title" className="sr-only">
              보고서 제목
            </label>
            <input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (비워두면 자동으로 붙습니다)"
              maxLength={60}
              className={`${field} w-full sm:flex-1`}
            />
            <button type="submit" disabled={busy} className={btn.primary}>
              {busy ? "저장 중…" : "보고서 만들기"}
            </button>
          </form>
          {existing && (
            <p className="mt-3 text-meta text-ink-dim">
              같은 범위로 저장한 보고서가 있습니다 ·{" "}
              <Link href={`/reports?id=${existing.id}`} className="font-semibold text-brand hover:underline">
                {existing.title}
              </Link>
            </p>
          )}

        </Panel>
        </>
      ) : (
        <EmptyState />
      )}

      <Panel className="mt-6" aria-labelledby="saved-reports">
        <PanelHeader
          id="saved-reports"
          title="저장한 보고서"
          description={reports.length ? `${reports.length}건 · 이 브라우저에 보관` : undefined}
        />
        {reports.length === 0 ? (
          <p className="px-5 pb-8 pt-6 text-center text-sub text-ink-dim md:px-6">
            아직 저장한 보고서가 없습니다. 위에서 첫 보고서를 만들어보세요.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports?id=${r.id}`} className="group flex gap-4 px-5 py-5 transition-colors hover:bg-surface-soft md:px-6">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand" aria-hidden>
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-body font-semibold text-ink group-hover:text-brand">{r.title}</span>
                      <span className="tabular text-meta text-ink-dim">{DATETIME.format(new Date(r.createdAt))}</span>
                    </span>
                    <span className="mt-0.5 block text-meta text-ink-dim">
                      {r.datasetName} · {scopeLabel(r.scope)}
                    </span>
                    <span className="mt-2 block text-sub text-ink">
                      {r.headline}
                      {r.brief?.change && <span className="text-ink-soft"> {r.brief.change.title}.</span>}
                    </span>
                    {(r.brief?.risk || r.anomalies.length > 0) && (
                      <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-negative-soft px-2.5 py-0.5 text-caption font-semibold text-negative">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-negative" aria-hidden />
                        <span className="truncate">
                          위험 요소 {r.findings.filter((f) => f.impact === "negative").length + r.anomalies.length}건
                          {r.brief?.risk ? ` · ${r.brief.risk.title}` : ""}
                        </span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function ReportsView() {
  const params = useSearchParams();
  const { ready, reports } = useApp();
  const id = params.get("id");

  if (!ready) return <PageSkeleton />;
  if (id) {
    const report = reports.find((r) => r.id === id);
    if (!report) {
      return (
        <>
          <PageHeader title="보고서를 찾을 수 없습니다" description="삭제되었거나 다른 브라우저에서 저장한 보고서입니다." />
          <Link href="/reports" className={btn.secondary}>
            보고서 목록으로
          </Link>
        </>
      );
    }
    return <ReportDetail report={report} />;
  }
  return <ReportLibrary />;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsView />
    </Suspense>
  );
}
