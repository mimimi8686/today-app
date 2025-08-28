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
      openGraph: {
        title: "今日なにする？",
        description: "もう迷わない。今日の行動が見つかるアプリ",
        url: "https://todayplan.jp",
        siteName: "今日なにする？",
        images: [
          {
            url: "/ogp.png",
            width: 1200,
            height: 630,
          },
        ],
        locale: "ja_JP",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "今日なにする？",
        description: "もう迷わない。今日の行動が見つかるアプリ",
        images: ["/ogp.png"],
      },

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
