"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { MiraeWordmark } from "@/components/MiraeLogo";

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 py-4 last:border-0">
      <div>
        <p className="text-[20px] font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-[18px] text-ink-dim">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${on ? "bg-brand" : "bg-line"}`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-all duration-200 ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { filters, setFilters, showToast } = useApp();
  const [alertOn, setAlertOn] = useState(true);
  const [weeklyOn, setWeeklyOn] = useState(false);
  const [currency, setCurrency] = useState("KRW");
  const [retention, setRetention] = useState("12");

  const selectCls =
    "h-12 rounded-xl border border-line bg-surface-soft px-2.5 text-[19px] text-ink-soft outline-none transition-colors hover:border-line-strong focus:border-brand";

  return (
    <>
      <PageHeader subtitle="프로필과 분석 기본값을 관리합니다" />

      <div className="card animate-fade-up p-5">
        <h3 className="text-[21px] font-semibold">프로필</h3>
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-[27px] font-bold text-brand">{BRAND.user.initial}</span>
          <div>
            <p className="text-[21px] font-bold text-ink">{BRAND.user.display}</p>
            <p className="mt-0.5 text-[17px] text-ink-soft">{BRAND.user.role} · Pro 플랜</p>
          </div>
          <button
            onClick={() => showToast("프로필 편집은 정식 버전에서 제공됩니다.", "info")}
            className="ml-auto rounded-xl border border-line px-3.5 py-2 text-[19px] font-medium text-ink-soft transition-colors hover:border-line-strong"
          >
            편집
          </button>
        </div>
      </div>

      <div className="card mt-4 animate-fade-up px-5 py-1" style={{ animationDelay: "70ms" }}>
        <Row label="분석 기본 기간" desc="대시보드를 열 때 적용되는 기본 기간입니다">
          <select
            value={filters.rangeDays}
            onChange={(e) => {
              setFilters({ rangeDays: Number(e.target.value) as 7 | 30 | 90 });
              showToast("기본 기간이 변경되었습니다.", "success");
            }}
            className={selectCls}
          >
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
        </Row>
        <Row label="통화" desc="지표 표시에 사용할 통화 단위입니다">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
            <option value="KRW">₩ KRW</option>
            <option value="USD">$ USD</option>
          </select>
        </Row>
        <Row label="이상징후 알림" desc="Critical 이상징후 감지 시 알림을 받습니다">
          <Toggle on={alertOn} onChange={setAlertOn} />
        </Row>
        <Row label="주간 요약 리포트" desc="매주 월요일 아침 요약 보고서를 받습니다">
          <Toggle on={weeklyOn} onChange={setWeeklyOn} />
        </Row>
        <Row label="데이터 보존 기간" desc="업로드한 데이터의 보관 기간입니다">
          <select value={retention} onChange={(e) => setRetention(e.target.value)} className={selectCls}>
            <option value="3">3개월</option>
            <option value="12">12개월</option>
            <option value="36">36개월</option>
          </select>
        </Row>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2.5 border-t border-line pt-6 text-center">
        <MiraeWordmark height={48} />
        <p className="text-[17px] text-ink-soft">{BRAND.credit}</p>
        <p className="text-[16px] text-ink-dim">
          {BRAND.product} MVP v0.1 · 데모 환경에서는 일부 설정이 저장되지 않습니다.
        </p>
      </div>
    </>
  );
}
