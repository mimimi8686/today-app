// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import GATracker from "@/app/ga-tracker";
import { GA_ID } from "@/lib/gtag";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // 絶対URL用
  metadataBase: new URL("https://todayplan.jp"),

  // OGP / Twitter
  openGraph: {
    title: "今日なにする？",
    description: "もう迷わない。今日の行動が見つかるアプリ",
    url: "https://todayplan.jp",
    siteName: "今日なにする？",
    images: [{ url: "/ogp.png", width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "今日なにする？",
    description: "もう迷わない。今日の行動が見つかるアプリ",
    images: ["/ogp.png"],
  },

  // PWA
  manifest: "/manifest.json",
  themeColor: "#16a34a",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png" }, { url: "/icon-512.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ルーター遷移ごとにPV送信 */}
        <GATracker />
        {children}

        {/* Google Analytics (初期ロード) */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
