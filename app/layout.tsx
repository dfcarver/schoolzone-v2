import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { DemoConfigProvider } from "@/lib/demoConfig";
import { LiveStateProvider } from "@/lib/LiveStateProvider";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SchoolZone Digital Twin",
  description: "School Zone Digital Twin Operations Console",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <DemoConfigProvider>
          <LiveStateProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </LiveStateProvider>
        </DemoConfigProvider>
      </body>
    </html>
  );
}
