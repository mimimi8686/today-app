// /app/history/page.tsx
import "server-only";
import Link from "next/link";
import { getDb } from "@/lib/_db.off";
import { readUserId } from "@/lib/user";
import NavMenu from "@/components/NavMenu";

export const dynamic = "force-dynamic";

function minutesToHHMM(total: number) {
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

type PlanItem = { id: string; title: string; duration: number };
type PlanPayload = { items: PlanItem[]; startTime?: string };
type PlanRow = { id: number; title: string; payloadJson: string; createdAt: string };

export default async function HistoryPage() {
  const uid = await readUserId();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const rows = uid
    ? (db.prepare(`
        SELECT id, title, payload_json as payloadJson, created_at as createdAt
        FROM plans WHERE user_id=? ORDER BY created_at DESC
      `).all(uid) as PlanRow[])
    : [];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="flex items-center justify-between">
        <NavMenu />
        <h1 className="text-2xl font-bold">保存済みタイムライン</h1>
      </header>

      {(!rows || rows.length === 0) ? (
        <p className="mt-4 text-gray-500">まだ保存はありません。</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const payload = JSON.parse(r.payloadJson) as PlanPayload;
            const items = payload.items ?? [];
            const total = items.reduce((s, i) => s + (i.duration ?? 0), 0);
            const start = payload.startTime ?? "09:00";
            const [h, m] = start.split(":").map((s) => parseInt(s, 10)) as [number, number];
            const end = minutesToHHMM(h * 60 + m + total);

            const t = Buffer.from(JSON.stringify(payload))
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
            const loadUrl = `/plan?t=${t}`;

            return (
              <li key={r.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <h2 className="mt-1 text-lg font-semibold">{r.title}</h2>
                <div className="mt-1 text-sm text-gray-600">
                  開始 {start} / 終了 {end} / 合計 {total}分
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={loadUrl}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                  >
                    読み込む
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
