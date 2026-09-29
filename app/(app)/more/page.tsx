"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { PRIMARY_NAV, WORKSPACE_NAV } from "@/lib/nav";

const TAB_HREFS = ["/dashboard", "/anomalies", "/insights", "/reports"];

/** 모바일 '더보기' — 하단 탭에 없는 메뉴 */
export default function MorePage() {
  const groups = [
    { title: "분석", items: PRIMARY_NAV.filter((n) => !TAB_HREFS.includes(n.href)) },
    { title: "작업 공간", items: WORKSPACE_NAV },
    { title: "안내", items: [{ href: "/intro", label: "서비스 소개", hint: "InsightAI가 하는 일", icon: null }] },
  ];

  return (
    <>
      <PageHeader title="더보기" />
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h2 className="mb-2 px-1 text-caption font-semibold text-ink-dim">{g.title}</h2>
            <Panel as="div">
              <ul className="divide-y divide-line">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="flex min-h-14 items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-soft">
                        {Icon && <Icon className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-body font-semibold text-ink">{item.label}</span>
                          <span className="block text-meta text-ink-dim">{item.hint}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        ))}
      </div>
    </>
  );
}
