"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { KEYS, readJson, writeJson } from "@/lib/persist";

const STEPS = [
  { title: "요약 문장으로 결론부터", body: "가장 큰 변화 · 원인 · 위험을 숫자 대신 문장으로 먼저 읽습니다." },
  { title: "차트의 점 → 그날 원인 조사", body: "평소와 다른 날에 점이 찍힙니다. 누르면 무엇이 왜 달랐는지 봅니다." },
  { title: "보고서로 저장해 기록", body: "확인한 결론을 날짜·범위와 함께 남기고 PDF로 공유합니다." },
] as const;

/**
 * 처음 온 사람에게만 보이는 대시보드 읽는 법 — 세 단계, 한 번 닫으면 다시 나오지 않는다.
 * 저장 여부는 브라우저에서만 알 수 있으므로 화면이 그려진 뒤에 판단한다.
 */
export default function ReadingGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!readJson<boolean>(KEYS.guide, false)), []);

  if (!show) return null;
  const close = () => {
    writeJson(KEYS.guide, true);
    setShow(false);
  };

  return (
    <aside aria-labelledby="guide-title" className="animate-fade-in mb-6 rounded-card border border-brand/15 bg-brand-soft/60 px-4 pb-4 pt-2 md:px-6 md:pb-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="guide-title" className="text-sub font-bold text-ink">
          처음이라면 이 순서로 보세요
        </h2>
        <button
          onClick={close}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-meta font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          알겠어요 <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ol className="grid gap-2 md:grid-cols-3 md:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-2.5 md:gap-3">
            <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-caption font-bold text-white" aria-hidden>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sub font-semibold leading-6 text-ink">{s.title}</span>
              {/* 좁은 화면에서는 단계 이름만 — 요약이 첫 화면에서 밀려나지 않게 */}
              <span className="mt-0.5 hidden text-meta text-ink-soft md:block">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
