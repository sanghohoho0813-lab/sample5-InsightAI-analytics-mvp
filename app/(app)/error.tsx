"use client";

import { useEffect } from "react";
import { btn } from "@/lib/ui";
import { clearAll } from "@/lib/persist";

/** 화면을 그리다 오류가 나면 앱 전체가 멈추지 않도록 이 영역만 대신 보여준다. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // 브라우저에 저장된 데이터가 손상된 경우를 위한 마지막 수단
  const clearAndReload = () => {
    clearAll();
    window.location.assign("/dashboard");
  };


  return (
    <div className="card mx-auto mt-6 max-w-lg px-6 py-12 text-center" role="alert">
      <h1 className="text-title font-bold text-ink">화면을 불러오지 못했습니다</h1>
      <p className="mt-2 text-body text-ink-soft">잠시 후 다시 시도해주세요. 계속되면 저장된 데모 데이터를 비우고 다시 시작할 수 있습니다.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className={btn.primary}>
          다시 시도
        </button>
        <button onClick={clearAndReload} className={btn.secondary}>
          데모 데이터 비우고 시작
        </button>
      </div>
    </div>
  );
}
