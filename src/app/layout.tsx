import type { Metadata, Viewport } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "JTEC Academic Platform",
    template: "%s | JTEC Academic Platform",
  },
  description:
    "The academic platform for Jhenaidah Textile Engineering College - materials, notices, results, and rankings in one place.",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JTEC Academic",
  },
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
    <html
      lang="en"
      className={`dark bg-[#060A12] ${inter.variable} ${hindSiliguri.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#060A12] text-slate-100 antialiased">
        <TopProgressBar />
        {children}
      </body>
    </html>
  );
}