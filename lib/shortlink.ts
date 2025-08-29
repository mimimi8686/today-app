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

/** 短縮リンクでやり取りするデータ型（仮） */
export type IdeaItem = {
  id: string;
  title: string;
  // 必要なら他のプロパティを追加: e.g. tags?: string[]; duration?: number;
};

/** 共有用ペイロード（仮） */
export type SharePayload = {
  ideas: IdeaItem[];
  title?: string;
};

/**
 * IDから短縮リンク情報を読み込む（仮実装）
 * 後で Supabase 実装に差し替える想定
 */
export async function loadShortLink(id: string): Promise<SharePayload | null> {
  // TODO: Supabase から id に対応する SharePayload を取得する実装に置き換え
  // ひとまず型エラー回避のためのスタブ
  return null;
}
/* ========================= 追記ここまで ========================= */
