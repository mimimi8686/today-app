// lib/gtag.ts
declare global {
    interface Window {
      dataLayer: any[];
      gtag: (...args: any[]) => void;
    }
  }
  
  export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
  
  // ルーター遷移時のPV送信
  export const pageview = (url: string) => {
    if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
    window.gtag("config", GA_ID, { page_path: url });
  };
  