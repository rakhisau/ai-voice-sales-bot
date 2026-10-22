import { Suspense } from "react";
import { Geist } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "FlowDesk AI Voice Sales Bot",
  description: "AI voice sales agent with live transcript, call recording, AI summary and sales status.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="app-bg flex min-h-full flex-col overflow-x-hidden text-slate-100">
        <Suspense fallback={<div className="h-16" />}>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
        <footer className="py-6 text-center text-xs text-slate-500">
          Built with Next.js · Vapi Voice AI · GPT-4o-mini
        </footer>
      </body>
    </html>
  );
}
