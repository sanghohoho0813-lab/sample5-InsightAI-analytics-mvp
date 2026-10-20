import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import TopBar from "@/components/TopBar";
import AppFooter from "@/components/AppFooter";
import DrillWatcher from "@/components/DrillWatcher";
import RouteFocus from "@/components/RouteFocus";
import CommandPalette from "@/components/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <Sidebar />
      <div className="lg:ml-[248px]">
        <TopBar />
        <main id="main" tabIndex={-1} className="px-4 pb-28 pt-6 outline-none md:px-8 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-[1280px]">
            {children}
            <AppFooter />
          </div>
        </main>
      </div>
      <MobileNav />
      <DrillWatcher />
      <RouteFocus />
      <CommandPalette />
    </div>
  );
}
