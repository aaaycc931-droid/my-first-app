import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "视唱练耳学习平台",
  description: "面向中文学习者的私有视唱、练耳、节奏与钢琴辅助学习平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
