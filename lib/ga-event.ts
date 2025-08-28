type GtagCommand = "js" | "config" | "event";
type GtagFn = (command: GtagCommand, ...args: unknown[]) => void;
type EventParams = Record<string, unknown>;

export const gaEvent = (action: string, params?: EventParams): void => {
  const id: string | undefined = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || typeof window === "undefined") return;
  const w = window as Partial<Window> & { gtag?: GtagFn };
  if (!w.gtag) return;

  const payload: EventParams = { ...(params ?? {}), debug_mode: true };
  w.gtag("event", action, payload);
};
