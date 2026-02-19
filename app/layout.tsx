import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
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
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 bg-gray-50 min-w-0">{children}</main>
              </div>
            </ToastProvider>
          </LiveStateProvider>
        </DemoConfigProvider>
      </body>
    </html>
  );
}
