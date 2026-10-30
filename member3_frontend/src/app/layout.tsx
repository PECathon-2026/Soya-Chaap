import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevPilot // Multi-Agent AI Engineering Mission Control",
  description: "Mission control web app for multi-agent autonomous AI engineering teams (Shogun, Samurai, Sentinel, Shadow, Orchestrator).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08090C] text-zinc-100 antialiased selection:bg-rose-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
