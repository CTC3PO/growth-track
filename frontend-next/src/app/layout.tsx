import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/shared/components/BottomNav";
import { ToastProvider } from "@/shared/components/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mindful Life AI — Personal Life Integration",
  description: "Track your running, reading, journaling, and life goals with AI-powered insights",
};

export const viewport: Viewport = {
  themeColor: "#2a9d6e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased min-h-screen pb-24 max-w-xl mx-auto`}
      >
        {children}
        <BottomNav />
        <ToastProvider />
      </body>
    </html>
  );
}
