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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Politics Sides",
  description: "Pay to push the political mood slider left or right.",
  keywords: ["politics", "slider", "payments", "stripe", "funding"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Politics Sides",
    description: "Pay to push the political mood slider left or right.",
    url: "/",
    siteName: "Politics Sides",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Politics Sides",
    description: "Pay to push the political mood slider left or right.",
  },
  robots: {
    index: true,
    follow: true,
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
