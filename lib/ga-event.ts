// lib/ga-event.ts
export const gaEvent = (action: string, params?: Record<string, any>) => {
    const id = process.env.NEXT_PUBLIC_GA_ID;
    if (!id || typeof window === "undefined" || !(window as any).gtag) return;
    (window as any).gtag("event", action, params);
  };
  