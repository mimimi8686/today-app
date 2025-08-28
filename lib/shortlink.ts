// /lib/shortlink.ts
import "server-only";
import { getDb } from "@/lib/db";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export type SharePayload = {
  title?: string;
  request?: any;   // outcome/mood/party/conditions など自由
  ideas?: any[];   // 共有時点の候補（必要なら）
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
