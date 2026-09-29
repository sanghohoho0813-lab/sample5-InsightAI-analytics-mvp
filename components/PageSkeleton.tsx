/** 저장된 상태를 복원하는 동안의 자리 표시 — 빈 화면이 깜빡이지 않게 한다. */
export default function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-9 w-48" />
      <div className="skeleton mt-3 h-5 w-72 max-w-full" />
      <div className="skeleton mt-8 h-40 w-full" />
      <div className="skeleton mt-4 h-72 w-full" />
    </div>
  );
}
