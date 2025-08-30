// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Inter } from "next/font/google";

import GATracker from "@/app/ga-tracker";
import { GA_ID } from "@/lib/gtag";

// ▼ Google Fonts: Inter に置き換え（Geist は google には無い）
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const viewport = {
  themeColor: "#f0fdfa",
};

export const metadata: Metadata = {
  // 絶対URL用
  metadataBase: new URL("https://todayplan.jp"),
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "linear-gradient(135deg, #16a34a, #4ade80)" },
    { media: "(prefers-color-scheme: dark)", color: "linear-gradient(135deg, #065f46, #16a34a)" },
  ],

  // OGP / Twitter
  openGraph: {
    title: "今日なにする？",
    description: "もう迷わない。今日の行動が見つかるアプリ",
    url: "https://todayplan.jp",
    siteName: "今日なにする？",
    images: [{ url: "/ogp_v2.png", width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "今日なにする？",
    description: "もう迷わない。今日の行動が見つかるアプリ",
    images: ["/ogp_v2.png"],
  },

  // PWA
  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192_v2.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512_v2.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192_v2.png" }, { url: "/icon-512_v2.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      {/* ▼ Inter の CSS 変数を body に付与（antialiased はそのまま） */}
      <body className={`${inter.variable} antialiased`}>
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

                // ✅ DebugViewで確実に見えるように
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                  debug_mode: true
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
