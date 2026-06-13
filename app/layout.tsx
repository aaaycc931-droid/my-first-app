import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "个人作品集 | Product Designer & Developer",
  description: "一个使用 Next.js、TypeScript 与 Tailwind CSS 构建的现代个人作品集网站。",
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
