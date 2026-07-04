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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e87eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e87eb" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="overscroll-none">
      <head>
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="英语加速器" />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              "if ('serviceWorker' in navigator) {",
              "  window.addEventListener('load', function() {",
              "    navigator.serviceWorker.register('/sw.js');",
              "  });",
              "}",
            ].join('\n'),
          }}
        />
        <style>{[
          'html, body { overscroll-behavior: none; }',
        ].join('\n')}</style>
      </head>
     <body className="pb-20 md:pt-16 md:pb-0 min-h-screen bg-surface-secondary">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
