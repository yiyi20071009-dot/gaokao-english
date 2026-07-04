import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "Gaokao英语加速器",
  description: "基于默会知识与SM-2算法的智能高考英语学习系统",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "英语加速器",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="pb-20 md:pt-16 md:pb-0 min-h-screen bg-surface-secondary">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
