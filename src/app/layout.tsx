import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "养殖场核算平台",
  description: "面向养殖企业的温室气体排放核算平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>

        <footer className="bg-gray-900 border-t border-green-900/40 px-6 py-6">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              养殖场温室气体排放核算平台
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{new Date().getFullYear()} · farmghg.cn</span>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 transition hover:text-white"
              >
                京ICP备2026017960号-1
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}