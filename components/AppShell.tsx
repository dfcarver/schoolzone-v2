"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { NotificationsProvider } from "@/lib/notifications";
import TopNav from "@/components/TopNav";
import DemoBanner from "@/components/DemoBanner";
import DemoFlow from "@/components/DemoFlow";
import AlertEngine from "@/components/AlertEngine";
import InterventionNotifier from "@/components/InterventionNotifier";

const NO_CHROME_ROUTES = ["/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noChrome = NO_CHROME_ROUTES.includes(pathname);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          {noChrome ? (
            <>{children}</>
          ) : (
            <div className="flex flex-col min-h-screen">
              <TopNav />
              <DemoBanner />
              <main className="flex-1">{children}</main>
              <DemoFlow />
              <AlertEngine />
              <InterventionNotifier />
            </div>
          )}
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
