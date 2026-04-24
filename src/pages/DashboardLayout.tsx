import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout iOS : header sticky translucide, sidebar inset (flotte avec radius),
 * fond gris iOS systemGroupedBackground.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex w-full overflow-x-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 md:ml-60 transition-all duration-300 w-full min-w-0 overflow-x-hidden">
          {/* pb-28 mobile pour ne rien masquer sous la bottom nav iOS (bouton scan dépasse) */}
          <div className="px-3 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-6 w-full overflow-x-hidden pb-28 md:pb-8">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
