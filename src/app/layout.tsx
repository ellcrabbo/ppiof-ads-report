import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PPIOF Ads Report",
  description: "Meta Ads analytics dashboard for campaign performance, creatives, and executive reporting.",
  keywords: ["PPIOF", "Meta Ads", "campaign analytics", "performance dashboard", "marketing report"],
  authors: [{ name: "PPIOF" }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "PPIOF Ads Report",
    description: "Meta Ads analytics dashboard and reporting",
    url: "https://ppiof-ads-report.vercel.app",
    siteName: "PPIOF Ads Report",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PPIOF Ads Report",
    description: "Meta Ads analytics dashboard and reporting",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
