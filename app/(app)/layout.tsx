import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <main className="min-h-dvh px-4 pb-24 pt-5 md:px-6 lg:ml-60 lg:pb-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
