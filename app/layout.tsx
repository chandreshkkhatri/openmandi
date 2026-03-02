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
  title: "Open Mandi | Trade Gold & Silver with Crypto",
  description:
    "Open Mandi is where crypto meets commodities. Trade gold and silver futures with USDC — no bank account needed, no paperwork, no waiting around.",
  keywords: [
    "cryptocurrency",
    "gold futures",
    "silver futures",
    "commodities exchange",
    "crypto trading",
    "precious metals",
    "digital assets",
  ],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Open Mandi | Trade Gold & Silver with Crypto",
    description:
      "Open Mandi is where crypto meets commodities. Trade gold and silver futures with USDC — no bank account needed.",
    type: "website",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
