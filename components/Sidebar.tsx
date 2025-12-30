// components/Sidebar.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Home, Clipboard, Package, Calendar, PlusCircle, List, Menu, Send, LogOut, Bell, Upload, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/create-order", icon: PlusCircle, label: "Create Order" },
    { href: "/invoices", icon: FileText, label: "Invoices" },
    { href: "/tasks", icon: Clipboard, label: "View Tasks" },
    { href: "/inventory", icon: Package, label: "Inventory" },
    { href: "/product-list", icon: Package, label: "Product List" },
    { href: "/attendance", icon: Calendar, label: "Attendance" },
    { href: "/orders", icon: List, label: "View Orders" },
    { href: "/sent-orders", icon: Send, label: "Sent Orders" },
    { href: "/credit", icon: CreditCard, label: "Credits" },
    { href: "/notices", icon: Bell, label: "Notices" },
    { href: "/invoice-report", icon: FileText, label: "Invoice Report" },
  ];

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        window.location.href = "/login";
      } else {
        console.error("Sign out failed");
      }
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleLinkClick = () => {
    setOpen(false); // Close mobile sidebar when link is clicked
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo/Brand Section */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Printing Center</h1>
      </div>
      
      {/* Navigation Menu - Scrollable */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link 
                href={item.href} 
                className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 group"
                onClick={handleLinkClick}
              >
                <item.icon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-900" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Sign Out Button - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <Button 
          variant="outline" 
          className="w-full justify-start hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors duration-150" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed and Static */}
      <aside className="hidden md:flex bg-white text-gray-800 w-64 border-r border-gray-200 flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar using Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md hover:bg-gray-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-white">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}