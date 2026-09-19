"use client";

import { ReactNode, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { PanelLeftOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        isMobile={isMobile}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile-only floating toggle when sidebar is closed */}
        {isMobile && !isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-3 left-3 z-30 w-9 h-9 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm border border-border/40 text-secondary/70 hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
            aria-label="Open navigation"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        <main className="flex-1 overflow-y-auto relative w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

