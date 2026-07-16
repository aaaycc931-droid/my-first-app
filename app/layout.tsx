import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistration } from "../components/platform/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "视唱练耳学习平台",
  description: "面向中文学习者的私有视唱、练耳、节奏与钢琴辅助学习平台。",
  applicationName: "视唱练耳",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "视唱练耳",
  },
  icons: {
    icon: [
      { url: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/app-icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#312e81",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
