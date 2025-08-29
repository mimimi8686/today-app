// lib/shortlink.ts - 暫定スタブ（後で Supabase 版に差し替え）

/** 短縮リンクを作る（いまはDB未保存・IDだけ生成） */
export async function createShortLink(originalUrl: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return { id, url: originalUrl };
}

/** IDから元URLを取る（いまは未対応） */
export async function getOriginalUrl(id: string) {
  return null;
}
