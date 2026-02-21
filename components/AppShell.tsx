"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import Sidebar from "@/components/Sidebar";

interface MobileNavContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export function useMobileNav() {
  return useContext(MobileNavContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggle = useCallback(() => setSidebarOpen((v) => !v), []);
  const close = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <AuthProvider>
      <MobileNavContext.Provider value={{ isOpen: sidebarOpen, toggle, close }}>
        {isLoginPage ? (
          <>{children}</>
        ) : (
          <div className="flex min-h-screen">
            {/* Desktop sidebar — always visible */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Mobile sidebar — overlay drawer */}
            {sidebarOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={close} />
                <div className="relative w-56 h-full animate-slide-in">
                  <Sidebar />
                </div>
              </div>
            )}

            <main className="flex-1 bg-gray-50 min-w-0">{children}</main>
          </div>
        )}
      </MobileNavContext.Provider>
    </AuthProvider>
  );
}
