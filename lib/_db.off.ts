// /lib/db.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// 保存場所: プロジェクト直下の var/data/app.db
const DATA_DIR = path.join(process.cwd(), "var", "data");
const DB_FILE = path.join(DATA_DIR, "app.db");

// フォルダが無ければ作る
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// DBシングルトン（1回だけ開く）
let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_FILE);
  _db.pragma("journal_mode = WAL"); // 書き込み安定化
  return _db;
}
