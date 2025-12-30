"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignInPage = pathname?.startsWith("/signin");

  // If on signin page, render children without dashboard UI
  if (isSignInPage) {
    return (
      <>
        {children}
        <Toaster />
        <Sonner />
      </>
    );
  }

  // Otherwise, render with dashboard UI
  return (
    <div className="flex h-screen">
      {/* Static Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 md:px-6 flex-shrink-0 sticky top-0 z-40">
          <div className="flex items-center w-full">
            <div className="ml-12 md:ml-0">
              <h2 className="text-xl font-semibold text-gray-900">Printing Center Dashboard</h2>
            </div>
          </div>
        </header>
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin smooth-scroll">
          <div className="p-4 md:p-6 max-w-full">
            {children}
          </div>
        </main>
        
        <Toaster />
        <Sonner />
      </div>
    </div>
  );
}

