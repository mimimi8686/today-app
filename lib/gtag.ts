// lib/gtag.ts

// gtag() の簡易型（any を使わない）
type GtagCommand = "js" | "config" | "event";
type GtagFn = (command: GtagCommand, ...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: GtagFn;
  }
}

export const GA_ID: string = process.env.NEXT_PUBLIC_GA_ID ?? "";

/**
 * ルーター遷移時の PV 送信
 * App Router では <GATracker /> からこれを呼ぶ
 */
export const pageview = (url: string): void => {
  if (!GA_ID || typeof window === "undefined") return;
  const gtag = (window as Partial<Window>).gtag;
  if (!gtag) return;
  gtag("config", GA_ID, { page_path: url });
};
