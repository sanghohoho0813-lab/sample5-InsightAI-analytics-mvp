"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { NAV_ITEMS } from "@/components/Sidebar";

/** 모바일 하단 네비게이션의 '더보기' — 전체 메뉴 */
export default function MorePage() {
  return (
    <>
      <PageHeader subtitle="전체 메뉴" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className="card card-hover animate-fade-up flex flex-col items-start gap-3 p-4"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
              <Icon className="h-5 w-5 text-brand" />
            </span>
            <span className="text-[13.5px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
