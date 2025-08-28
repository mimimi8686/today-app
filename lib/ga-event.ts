// lib/ga-event.ts

// gtag() の簡易型（any を使わない）
type GtagCommand = "js" | "config" | "event";
type GtagFn = (command: GtagCommand, ...args: unknown[]) => void;

type EventParams = Record<string, unknown>;

export const gaEvent = (action: string, params?: EventParams): void => {
  const id: string | undefined = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || typeof window === "undefined") return;
  const w = window as Partial<Window> & { gtag?: GtagFn };
  if (!w.gtag) return;
  w.gtag("event", action, params ?? {});
};
