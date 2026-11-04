import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

export const metadata: Metadata = {
  title: {
    default: "JTEC Academic Platform",
    template: "%s | JTEC Academic Platform",
  },
  description:
    "The academic platform for Jhenaidah Textile Engineering College \u2014 materials, notices, results, and rankings in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TopProgressBar />
        {children}
      </body>
    </html>
  );
}