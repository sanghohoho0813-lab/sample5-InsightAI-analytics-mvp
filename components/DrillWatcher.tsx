"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";

/**
 * 드릴다운 후 출발 화면으로 돌아가면(브라우저 뒤로 가기 포함) 그때의 범위로 되돌린다.
 * 다른 화면으로 옮겨 가면 좁힌 범위는 그대로 두고 드릴 맥락만 끝낸다.
 */
export default function DrillWatcher() {
  const pathname = usePathname();
  const { drill, endDrill } = useApp();
  const latest = useRef({ drill, endDrill });
  latest.current = { drill, endDrill };

  useEffect(() => {
    const { drill: d, endDrill: end } = latest.current;
    if (!d || pathname === "/analytics" || pathname === d.from) {
      if (d && pathname === d.from && d.from !== "/analytics") end(true);
      return;
    }
    end(false);
  }, [pathname]);

  return null;
}
