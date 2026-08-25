"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function SectionHeader({
  title,
  href,
  icon,
  count,
}: {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-[22.5px] font-bold text-ink">
        {icon}
        {title}
        {count != null && count > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-negative px-1 text-[16px] font-bold text-white">
            {count}
          </span>
        )}
      </h3>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[18px] font-semibold text-ink-soft transition-colors hover:text-brand"
        >
          전체 보기 <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
}
