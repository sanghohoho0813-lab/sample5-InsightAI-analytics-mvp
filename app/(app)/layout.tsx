import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import TopBar from "@/components/TopBar";
import AppFooter from "@/components/AppFooter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:ml-[292px]">
        <TopBar />
        <main className="px-4 pb-32 pt-4 md:px-6 lg:pb-12 lg:pt-6">
          <div className="mx-auto w-full max-w-[1320px]">
            {children}
            <AppFooter />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
