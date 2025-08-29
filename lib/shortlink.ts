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

/* ========================= ここから追記 ========================= */

/** 共有で扱う1アイデア */
export type IdeaItem = {
  id: string;
  title: string;
  duration?: number;     // ← 追加（使っている箇所があるため）
  // 必要なら他: tags?: string[]; place?: "indoor" | "outdoor";
};

/** 共有ペイロード */
export type SharePayload = {
  ideas: IdeaItem[];
  title?: string;
  request?: unknown | null; // ← 追加（data.request を参照しているため）
};

/** IDから短縮リンク情報を読み込む（仮実装） */
export async function loadShortLink(id: string): Promise<SharePayload | null> {
  // TODO: Supabase 実装に差し替え
  return null;
}
/* ========================= 追記ここまで ========================= */
