// /lib/shortlink.ts
import "server-only";
import { getDb } from "@/lib/_db.off";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

// 共有に載せる1件
export type IdeaItem = {
  id: string;
  title: string;
  duration?: number;
};

// 共有時に付与する軽いリクエスト情報（将来拡張用。unknown でOK）
export type ShareRequest = {
  startTime?: string;
} & Record<string, unknown>;

export type SharePayload = {
  title?: string;
  request?: ShareRequest;
  ideas?: IdeaItem[];
};

// 初回だけテーブルを作る
function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS shortlinks (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// 短縮IDを作って保存
export function createShortLink(payload: SharePayload): string {
  ensureTable();
  const db = getDb();
  const id = nanoid();
  db.prepare(
    `INSERT INTO shortlinks (id, payload_json) VALUES (?, ?)`
  ).run(id, JSON.stringify(payload));
  return id;
}

// ID で読み出し
export function loadShortLink(id: string): SharePayload | null {
  ensureTable();
  const db = getDb();
  const row = db.prepare(
    `SELECT payload_json FROM shortlinks WHERE id = ?`
  ).get(id) as { payload_json: string } | undefined;
  return row ? (JSON.parse(row.payload_json) as SharePayload) : null;
}
