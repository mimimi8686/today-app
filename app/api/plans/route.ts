// /app/api/plans/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { USER_COOKIE, readUserId } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 保存するペイロードの型（/plan の内容）
type PlanItem = { id: string; title: string; duration: number };
type PlanPayload = { items: PlanItem[]; startTime?: string };
type SaveRequest = { title: string; payload: PlanPayload };

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_plans_user_created ON plans(user_id, created_at DESC);
  `);
}

function isPlanPayload(v: unknown): v is PlanPayload {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return false;
  // items のざっくりバリデーション
  for (const it of obj.items) {
    if (!it || typeof it !== "object") return false;
    const x = it as Record<string, unknown>;
    if (typeof x.id !== "string") return false;
    if (typeof x.title !== "string") return false;
    if (typeof x.duration !== "number") return false;
  }
  return true;
}

/** 保存（3件まで） */
export async function POST(req: Request) {
  ensureTable();

  // uid 決定（無ければ発行してレス時に Cookie セット）
  let userId = await readUserId();
  const needSetCookie = !userId;
  if (!userId) userId = crypto.randomUUID();

  const raw = (await req.json().catch(() => null)) as unknown;
  const title = typeof (raw as SaveRequest | null)?.title === "string" ? (raw as SaveRequest).title.trim() : "";
  const payload = (raw as SaveRequest | null)?.payload;

  if (!title || !payload || !isPlanPayload(payload)) {
    return NextResponse.json({ error: "title と payload は必須です" }, { status: 400 });
  }

  const db = getDb();
  const cnt = db.prepare(`SELECT COUNT(*) AS c FROM plans WHERE user_id=?`).get(userId) as { c: number } | undefined;
  if ((cnt?.c ?? 0) >= 3) {
    return NextResponse.json({ error: "無料プランは3件まで保存できます" }, { status: 409 });
  }

  db.prepare(`INSERT INTO plans (user_id, title, payload_json) VALUES (?,?,?)`)
    .run(userId, title, JSON.stringify(payload));

  const resJson = NextResponse.json({ ok: true });
  if (needSetCookie) {
    resJson.cookies.set(USER_COOKIE, userId!, {
      httpOnly: true,
      sameSite: "lax", // 型に合わせて小文字
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1年
    });
  }
  return resJson;
}

/** 一覧取得（匿名 uid ベース） */
export async function GET() {
  ensureTable();
  const userId = await readUserId();
  if (!userId) return NextResponse.json({ plans: [] });

  const db = getDb();
  type PlanRow = { id: number; title: string; payloadJson: string; createdAt: string };
  const rows = db.prepare(`
    SELECT id, title, payload_json as payloadJson, created_at as createdAt
    FROM plans
    WHERE user_id=?
    ORDER BY created_at DESC
  `).all(userId) as PlanRow[];

  const plans = rows.map(r => ({
    id: r.id,
    title: r.title,
    payload: JSON.parse(r.payloadJson) as PlanPayload,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ plans });
}
