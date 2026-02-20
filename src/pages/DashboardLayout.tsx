import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex w-full overflow-x-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        <main className="flex-1 md:ml-56 transition-all duration-300 w-full min-w-0 overflow-x-hidden">
          <div className="p-3 sm:p-4 lg:p-6 w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}