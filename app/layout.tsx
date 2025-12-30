// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import DashboardLayout from "@/components/DashboardLayout";

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
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </AuthProvider>
      </body>
    </html>
  );
}