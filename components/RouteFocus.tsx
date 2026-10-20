"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * 화면을 옮기면 키보드·화면 낭독기 초점을 새 본문 시작으로 옮긴다.
 * 첫 진입과 같은 화면 안의 이동(쿼리만 바뀌는 조사 넘기기 등)에서는 건드리지 않는다.
 */
export default function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
