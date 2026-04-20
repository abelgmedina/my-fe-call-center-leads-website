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
  metadataBase: new URL("https://uplineagent.com"),
  title: "Upline AI Agent",
  description: "Upline AI Agent lead portal and login experience",
  openGraph: {
    title: "Upline AI Agent",
    description: "Upline AI Agent lead portal and login experience",
    url: "https://uplineagent.com",
    siteName: "Upline AI Agent",
    images: [
      {
        url: "/brand/uai-logo.png",
        width: 512,
        height: 512,
        alt: "Upline AI Agent",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Upline AI Agent",
    description: "Upline AI Agent lead portal and login experience",
    images: ["/brand/uai-logo.png"],
  },
  icons: {
    icon: "/brand/uai-logo.png",
    shortcut: "/brand/uai-logo.png",
    apple: "/brand/uai-logo.png",
  },
};

import { ThemeInitScript } from '@/components/theme';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
