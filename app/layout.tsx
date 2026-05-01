import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avalon Helper",
  description: "线下阿瓦隆辅助网页工具"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

