import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "称量台 · 天平找伪币逻辑推理挑战",
  description:
    "用一台虚拟天平，在最少次数内从一堆硬币中揪出重量异常的那一枚。8/9/12/13/27 球，已知或未知轻重，极小化极大搜索实时提示最优称法。",
  applicationName: "称量台",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "称量台",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4efe2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
