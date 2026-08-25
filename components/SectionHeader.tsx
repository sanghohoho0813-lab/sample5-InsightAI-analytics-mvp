"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function SectionHeader({
  title,
  href,
  icon,
}: {
  title: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        {icon}
        {title}
      </h3>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[12px] font-medium text-accent-bright transition-colors hover:text-cyan-accent"
        >
          전체 보기 <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
