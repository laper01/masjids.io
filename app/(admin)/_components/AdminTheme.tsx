"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { AppBar } from "./AppBar";
import { NotificationToastContainer } from "@/components/notifications/NotificationToastContainer";


export function AdminTheme({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar collapsed={collapsed} />
      <main className={cn("min-h-screen transition-all duration-300", collapsed ? "pl-16" : "pl-64")}>
        <NotificationToastContainer />
        <AppBar onToggleSidebar={() => setCollapsed((v) => !v)} sidebarCollapsed={collapsed} />
        <div className="p-7">
          {children}
        </div>
      </main>
    </div>
  );
}