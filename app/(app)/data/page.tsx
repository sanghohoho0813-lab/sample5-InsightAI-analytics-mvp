"use client";

import { CheckCircle2, Clock, Database, Play, Table2, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import UploadPanel from "@/components/UploadPanel";
import DataTable from "@/components/DataTable";
import { useApp } from "@/lib/store";
import { getDemoDatasets } from "@/lib/demo-data";
import { formatDateKR } from "@/lib/format";

export default function DataPage() {
  const { dataset, history, startAnalysis, openAnalysis } = useApp();
  const demos = getDemoDatasets();

  return (
    <>
      <PageHeader subtitle="데이터를 업로드하거나 샘플 데이터로 시작하세요" />

      <section>
        <SectionHeader title="데이터 업로드" icon={<Upload className="h-6 w-6 text-brand" />} />
        <UploadPanel />
      </section>

      <section className="mt-6">
        <SectionHeader title="샘플 데이터로 시작하기" icon={<Database className="h-6 w-6 text-aqua" />} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {demos.map((ds, i) => {
            const active = dataset?.id === ds.id;
            return (
              <div key={ds.id} className={`card card-hover animate-fade-up flex flex-col p-4 ${active ? "border-brand" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-line px-2 py-0.5 text-[16px] font-medium text-ink-soft">{ds.category}</span>
                  {active && (
                    <span className="flex items-center gap-1 text-[16.5px] font-medium text-positive">
                      <CheckCircle2 className="h-5 w-5" /> 분석 중
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[21px] font-semibold">{ds.name}</p>
                <p className="mt-1 flex-1 text-[18px] leading-relaxed text-ink-soft">{ds.description}</p>
                <p className="mt-2 text-[16.5px] text-ink-dim">{ds.periodLabel} · {ds.rows.length.toLocaleString("ko-KR")}행</p>
                <button
                  onClick={() => startAnalysis(ds)}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-brand-soft px-3.5 py-2 text-[19px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  <Play className="h-5 w-5" /> {active ? "다시 분석" : "분석 시작"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {dataset && (
        <section className="mt-6">
          <SectionHeader title={`데이터 미리보기 — ${dataset.name}`} icon={<Table2 className="h-6 w-6 text-brand" />} />
          <div className="card animate-fade-up p-4">
            <DataTable rows={dataset.rows} />
          </div>
        </section>
      )}

      <section className="mt-6">
        <SectionHeader title="분석 히스토리" icon={<Clock className="h-6 w-6 text-ink-soft" />} />
        {history.length === 0 ? (
          <div className="card p-6 text-center text-[19px] text-ink-dim animate-fade-up">
            아직 분석 기록이 없습니다. 샘플 데이터로 첫 분석을 시작해보세요.
          </div>
        ) : (
          <div className="card animate-fade-up overflow-x-auto">
            <table className="w-full min-w-[900px] text-[19px]">
              <thead>
                <tr className="border-b border-line bg-surface-soft text-left text-[17px] uppercase tracking-wide text-ink-dim">
                  <th className="px-4 py-2.5 font-medium">분석명</th>
                  <th className="px-4 py-2.5 font-medium">Dataset</th>
                  <th className="px-4 py-2.5 font-medium">분석일</th>
                  <th className="px-4 py-2.5 font-medium">주요 Insight</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => openAnalysis(h)}
                    className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-surface-soft"
                  >
                    <td className="px-4 py-3 font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{h.datasetName}</td>
                    <td className="tabular px-4 py-3 text-ink-soft">{formatDateKR(h.createdAt.slice(0, 10))}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-ink-soft">{h.keyInsight}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-positive-soft px-2 py-0.5 text-[16.5px] font-medium text-positive">완료</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
