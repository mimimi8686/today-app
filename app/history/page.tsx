"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlanItem = {
  id: string;
  title: string;
  created_at: string;
  payload: {
    startTime?: string;
    items?: { id: string; title: string; duration?: number }[];
  };
};

// /plan?t=... に渡す安全な Base64(JSON)
function encodePlan(data: unknown) {
  const json = JSON.stringify(data);
  const b64 = typeof window === "undefined" ? Buffer.from(json).toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function HistoryPage() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plans", { credentials: "include", cache: "no-store" });
        const j = await res.json();
        if (!res.ok) setError(j?.error ?? "読み込みに失敗しました");
        else setItems(Array.isArray(j?.items) ? j.items : []);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function fmt(dt: string) {
    try {
      const d = new Date(dt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${y}/${m}/${day} ${h}:${mi}`;
    } catch { return dt; }
  }

  async function onDelete(id: string) {
    if (!confirm("このタイムラインを削除しますか？")) return;
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(p => p.id !== id));
    else alert((await res.json().catch(() => ({})))?.error ?? "削除に失敗しました");
  }

  async function onEditSave(id: string) {
    const title = tempTitle.trim();
    if (!title) { alert("タイトルを入力してください"); return; }
    const res = await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems(prev => prev.map(p => (p.id === id ? { ...p, title: updated.title } : p)));
      setEditing(null);
    } else {
      alert((await res.json().catch(() => ({})))?.error ?? "更新に失敗しました");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white">
            <span>🏠</span> <span>メニュー</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">保存したタイムライン</h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-6">
        {loading && <p className="text-gray-500">読み込み中…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-500">まだ保存がありません。タイムラインを作成して保存するとここに表示されます。</p>
        )}

        <ul className="grid gap-3">
          {items.map((p) => {
            const encoded = encodePlan({ items: p.payload?.items ?? [], startTime: p.payload?.startTime ?? "09:00" });
            const planUrl = `/plan?t=${encoded}`;

            return (
              <li key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  {/* 左：タイトル（タップで /plan を開く） */}
                  <div className="min-w-0">
                    {editing === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="h-10 w-64 max-w-full rounded-md border px-3"
                        />
                        <button onClick={() => onEditSave(p.id)} className="rounded-md bg-emerald-600 px-3 py-2 text-white">保存</button>
                        <button onClick={() => setEditing(null)} className="rounded-md border px-3 py-2">キャンセル</button>
                      </div>
                    ) : (
                      <>
                        <Link href={planUrl} className="text-lg font-semibold hover:underline">{p.title}</Link>
                        <div className="mt-1 text-sm text-gray-600">
                          保存日時：{fmt(p.created_at)}
                          {/* 開始・件数の表示は削除（ご要望） */}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 右：操作 */}
                  {editing !== p.id && (
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => { setTempTitle(p.title); setEditing(p.id); }}
                        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
                        title="タイトルを編集"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
