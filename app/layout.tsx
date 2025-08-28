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
  // 絶対URLを作るための基準
  metadataBase: new URL("https://todayplan.jp"),

  // タイトル（ページごとに上書きするときは template が効く）
  title: {
    default: "TodayPlan",
    template: "%s | TodayPlan",
  },
  description: "今日の予定をサクッと決めるアプリ",

  // PWA 用
  manifest: "/manifest.json",
  themeColor: "#16a34a",

  // アイコン類（favicon / PWA）
  icons: {
    icon: [
      { url: "/favicon.ico" }, // 32x32 でも OK
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png" },
      { url: "/icon-512.png" },
    ],
  },

  // OGP（Facebook等）
  openGraph: {
    type: "website",
    url: "https://todayplan.jp",
    title: "TodayPlan",
    description: "今日の予定をサクッと決めるアプリ",
    siteName: "TodayPlan",
    images: [
      {
        url: "/ogp.png", // /public/ogp.png（1200x630）
        width: 1200,
        height: 630,
        alt: "TodayPlan",
      },
    ],
    locale: "ja_JP",
  },

  // Twitterカード
  twitter: {
    card: "summary_large_image",
    title: "TodayPlan",
    description: "今日の予定をサクッと決めるアプリ",
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
