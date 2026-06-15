import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "五线谱识别 MVP | Sheet Music Recognition",
  description: "一个使用 Next.js、TypeScript 与 Tailwind CSS 构建的五线谱识别 MVP，用于验证乐谱图片上传、模拟识别结果展示和音符播放流程。",
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
