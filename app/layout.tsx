import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "미래사업팀 주간업무 대시보드",
  description: "미래사업팀 수행 프로젝트 및 발주예상 현황 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen" style={{ background: "var(--canvas)" }}>
        <main>{children}</main>
      </body>
    </html>
  );
}
