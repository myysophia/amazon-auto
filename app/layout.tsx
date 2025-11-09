import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amazon关键词筛选工具",
  description: "自动化批量搜索Amazon关键词，筛选符合条件的关键词",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

