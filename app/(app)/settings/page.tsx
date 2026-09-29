"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import { Panel, PanelHeader } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { btn, field } from "@/lib/ui";
import { AppSettings } from "@/lib/types";

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{label}</p>
        {desc && <p className="mt-1 text-meta text-ink-dim">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { ready, settings, updateSettings, resetDemo, history, reports, showToast } = useApp();
  const [confirming, setConfirming] = useState(false);

  if (!ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="설정" description="분석 기본값과 데모 데이터를 관리합니다. 설정은 이 브라우저에 저장됩니다." />

      <Panel>
        <PanelHeader title="분석" />
        <div className="mt-2 divide-y divide-line">
          <Row label="기본 분석 기간" desc="새 분석을 열거나 범위를 초기화할 때 적용됩니다. 바꾸면 지금 화면에도 바로 반영됩니다.">
            <select
              value={settings.defaultPreset}
              onChange={(e) => {
                updateSettings({ defaultPreset: e.target.value as AppSettings["defaultPreset"] });
                showToast("기본 분석 기간을 저장했습니다.", "success");
              }}
              aria-label="기본 분석 기간"
              className={field}
            >
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
            </select>
          </Row>
          <Row
            label="분석 엔진"
            desc="지표 집계·이상치 탐지·인사이트는 규칙 기반으로 계산합니다. 서버에 AI_API_KEY를 설정하면 데이터 질의 답변에 LLM을 사용합니다."
          >
            <span className="rounded-full border border-line-strong px-3 py-1 text-meta font-semibold text-ink-soft">규칙 기반 · 데모</span>
          </Row>
        </div>
      </Panel>

      <Panel className="mt-6">
        <PanelHeader title="계정" />
        <div className="mt-2 divide-y divide-line">
          <Row label={BRAND.user.display} desc={`${BRAND.user.role} · 데모 계정이라 편집할 수 없습니다`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sub font-bold text-brand" aria-hidden>
              {BRAND.user.initial}
            </span>
          </Row>
        </div>
      </Panel>

      <Panel className="mt-6">
        <PanelHeader title="데모 데이터" />
        <div className="mt-2 divide-y divide-line">
          <Row
            label="처음 상태로 되돌리기"
            desc={`분석 기록 ${history.length}건, 저장한 보고서 ${reports.length}건, 업로드 파일, 확인 표시, 설정을 모두 지우고 샘플 데이터로 다시 시작합니다.`}
          >
            {confirming ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfirming(false);
                    resetDemo();
                  }}
                  className={btn.danger}
                >
                  모두 지우기
                </button>
                <button onClick={() => setConfirming(false)} className={btn.secondary}>
                  취소
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className={btn.secondary}>
                데모 초기화
              </button>
            )}
          </Row>
        </div>
      </Panel>

      <p className="mt-6 text-meta text-ink-dim">
        {BRAND.product} MVP · {BRAND.credit}
      </p>
    </>
  );
}
