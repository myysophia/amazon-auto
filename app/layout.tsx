import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";

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
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
