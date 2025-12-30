// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Printing Center Dashboard",
  description: "Manage printing tasks, inventory, and employees",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <NextSSRPlugin
          /**
           * The `extractRouterConfig` will extract **only** the route configs
           * from the router to prevent additional information from being
           * leaked to the client. The data passed to the client is the same
           * as if you were to fetch `/api/uploadthing` directly.
           */
          routerConfig={extractRouterConfig(ourFileRouter)}
        />
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}