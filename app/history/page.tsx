// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import NavMenu from "@/components/NavMenu";

// URLに入れる安全なBase64(JSON)エンコード（plan/page.tsx と同等の簡易版）
function encodePlan(data: unknown) {
  const json = JSON.stringify(data);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json).toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type PlanItem = {
  id: string;
  title: string;
  created_at: string;
  payload: {
    startTime?: string;
    items?: { id: string; title: string; duration?: number }[];
  };
};

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plans", { cache: "no-store" });

        // 空レスポンスでも落ちないように first text → safe JSON
        const text = await res.text();
        let j: any = {};
        if (text) {
          try {
            j = JSON.parse(text);
          } catch {
            /* パース失敗でも j は {} のまま */
          }
        }

        if (!res.ok) {
          setError(j?.error ?? `読み込みに失敗しました (HTTP ${res.status})`);
        } else {
          setItems(Array.isArray(j?.items) ? j.items : []);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
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
    } catch {
      return dt;
    }
  }

  // ① 開く：/plan?t=... へ遷移
  function openPlan(p: PlanItem) {
    const items = (p.payload?.items ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      duration: i.duration ?? 60,
    }));
    const startTime = p.payload?.startTime ?? "09:00";
    const t = encodePlan({ items, startTime });
    router.push(`/plan?t=${t}`);
  }

  // ② タイトルをインライン保存（PATCH /api/plans）
  async function saveTitle(p: PlanItem) {
    const name = editingTitle.trim();
    setEditingId(null);
    if (!name || name === p.title) return;

    const res = await fetch(`/api/plans`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id, title: name }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "更新に失敗しました");
      return;
    }

    // 画面の状態を更新
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, title: name } : x)));
    setEditingTitle("");
  }

  // ③ 削除（DELETE /api/plans）
  async function deletePlan(p: PlanItem) {
    if (!confirm(`「${p.title}」を削除します。よろしいですか？`)) return;
    const res = await fetch(`/api/plans`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "削除に失敗しました");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          {/* 左：メニュー */}
          <NavMenu />
          {/* 右：見出し */}
          <h1 className="text-xl sm:text-2xl font-bold">保存したタイムライン</h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-6">
        {loading && <p className="text-gray-500">読み込み中…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-500">
            まだ保存がありません。タイムラインを作成して保存するとここに表示されます。
          </p>
        )}

        <ul className="grid gap-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border bg-white p-4 shadow-sm hover:shadow cursor-pointer"
              onClick={() => openPlan(p)}
              title="タップで開く"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  {/* タイトル：クリックでインライン編集 */}
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => saveTitle(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle(p);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingTitle("");
                        }
                      }}
                      className="text-lg font-semibold border rounded px-2 py-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      className="text-left text-lg font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(p.id);
                        setEditingTitle(p.title);
                      }}
                      title="クリックで名前を編集"
                    >
                      {p.title}
                    </button>
                  )}

                  <div className="mt-1 text-sm text-gray-600">保存日時：{fmt(p.created_at)}</div>
                </div>

                {/* 右側：ゴミ箱だけ */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlan(p);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-rose-700 border-rose-200 hover:bg-rose-50"
                    title="削除"
                    aria-label="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
