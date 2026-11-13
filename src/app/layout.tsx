import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

export const metadata: Metadata = {
  title: {
    default: "JTEC Academic Platform",
    template: "%s | JTEC Academic Platform",
  },
  description:
    "The academic platform for Jhenaidah Textile Engineering College — materials, notices, results, and rankings in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060A12",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark bg-[#060A12]" suppressHydrationWarning>
      <body className="min-h-screen bg-[#060A12] text-slate-100 antialiased">
        <TopProgressBar />
        {children}
      </body>
    </html>
  );
}