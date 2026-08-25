import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import TopBar from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:ml-[228px]">
        <TopBar />
        <main className="px-4 pb-24 pt-4 md:px-6 lg:pb-10 lg:pt-5">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
