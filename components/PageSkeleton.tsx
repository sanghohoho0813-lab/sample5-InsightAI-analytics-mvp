/**
 * 저장된 상태를 복원하는 동안의 자리 표시 — 빈 화면이 깜빡이지 않게,
 * 실제 화면과 같은 뼈대(제목 · 범위 · 요약 카드 · 차트와 목록)로 그려 두어 내용이 들어올 때 덜 흔들리게 한다.
 */
export default function PageSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">불러오는 중</span>
      <div aria-hidden>
        <div className="skeleton h-8 w-40" />
        <div className="skeleton mt-3 h-4 w-64 max-w-full" />
        <div className="mt-7 flex gap-2">
          <div className="skeleton h-11 w-full sm:w-44" />
          <div className="skeleton hidden h-11 w-44 sm:block" />
          <div className="skeleton hidden h-11 w-44 sm:block" />
        </div>
        <div className="card mt-6 overflow-hidden">
          <div className="p-5 md:px-7 md:py-6">
            <div className="skeleton h-5 w-28 rounded-full" />
            <div className="skeleton mt-4 h-8 w-4/5 max-w-[560px]" />
          </div>
          <div className="grid gap-px border-t border-line bg-line md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-surface p-5 md:px-7 md:py-6">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton mt-4 h-6 w-full" />
                <div className="skeleton mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="skeleton h-72 xl:col-span-2" />
          <div className="skeleton hidden h-72 xl:block" />
        </div>
      </div>
    </div>
  );
}
