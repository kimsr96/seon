import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "미래사업팀 주간업무 대시보드",
  description: "미래사업팀 수행 프로젝트 및 발주예상 현황 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-blue-900 text-white px-6 py-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">미래사업팀 주간업무 대시보드</h1>
              <p className="text-blue-200 text-sm mt-0.5">수행 프로젝트 현황판</p>
            </div>
            <a
              href="/api/export"
              download
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ⬇ HWPX 다운로드
            </a>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
