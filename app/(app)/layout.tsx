import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import TopBar from "@/components/TopBar";
import AppFooter from "@/components/AppFooter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:ml-[248px]">
        <TopBar />
        <main className="px-4 pb-28 pt-6 md:px-8 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-[1280px]">
            {children}
            <AppFooter />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
