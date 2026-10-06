import Link from "next/link";
import Logo from "@/components/Logo";
import { btn } from "@/lib/ui";

export const metadata = { title: "페이지를 찾을 수 없습니다" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 text-meta font-semibold text-ink-dim">404</p>
      <h1 className="mt-2 text-title font-bold text-ink">찾으시는 페이지가 없습니다</h1>
      <p className="mt-2 max-w-sm text-body text-ink-soft">주소가 바뀌었거나 잘못 입력되었을 수 있습니다.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/dashboard" className={btn.primary}>
          대시보드로 가기
        </Link>
        <Link href="/reports" className={btn.secondary}>
          보고서 목록
        </Link>
      </div>
    </main>
  );
}
