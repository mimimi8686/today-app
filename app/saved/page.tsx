"use client";

import { useEffect, useState } from "react";
import { Trash2, CheckSquare, Square, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import NavMenu from "@/components/NavMenu";

// Base64(JSON) エンコード（history と同じ流儀）
function encode(data: unknown) {
  const json = JSON.stringify(data);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json).toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type Idea = { id: string; title: string; created_at: string };

export default function SavedIdeasPage() {
  const router = useRouter();
  const [items, setItems] = useState<Idea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 選択モード
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ideas", { cache: "no-store" });
        const text = await res.text();
        let j: any = {};
        if (text) { try { j = JSON.parse(text); } catch {} }
        const list = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
        setItems(list);
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

  // 単体タップ → 1件追記
  function addOne(idea: Idea) {
    const payload = { items: [{ id: idea.id, title: idea.title, duration: 60 }] };
    // 保険用に localStorage にも入れておく
    if (typeof window !== "undefined") {
      localStorage.setItem("tp:add", JSON.stringify(payload));
    }
    router.push(`/plan?add=${encode(payload)}`);
  }

  // 複数選択 → 一括追記
  function addSelected() {
    const picked = items.filter((i) => selectedIds.has(i.id));
    if (picked.length === 0) return;
    const payload = {
      items: picked.map((i) => ({ id: i.id, title: i.title, duration: 60 })),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("tp:add", JSON.stringify(payload));
    }
    router.push(`/plan?add=${encode(payload)}`);
    // 解除
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function deleteIdea(idea: Idea) {
    if (!confirm(`「${idea.title}」を削除します。よろしいですか？`)) return;
    const res = await fetch("/api/ideas", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: idea.id }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "削除に失敗しました");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== idea.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idea.id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="px-6 py-4 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <NavMenu />
          <h1 className="text-xl sm:text-2xl font-bold">保存したアイディア</h1>
          <button
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds(new Set());
            }}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
            title="選択モード"
          >
            {selectMode ? "キャンセル" : "選択"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-6">
        {loading && <p className="text-gray-500">読み込み中…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-gray-500">保存されたアイディアはまだありません。</p>
        )}

        <ul className="grid gap-3">
          {items.map((idea) => {
            const checked = selectedIds.has(idea.id);
            return (
              <li
                key={idea.id}
                className="rounded-xl border bg-white p-4 shadow-sm hover:shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* 左側：タイトル（単体追加 or 選択トグル） */}
                  <button
                    className="text-left"
                    onClick={() => (selectMode ? toggleSelect(idea.id) : addOne(idea))}
                    title={selectMode ? "選択" : "タップで追加"}
                  >
                    <div className="flex items-center gap-2">
                      {selectMode ? (
                        checked ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )
                      ) : null}
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      保存日時：{fmt(idea.created_at)}
                    </div>
                  </button>

                  {/* 右側：削除 or 追加 */}
                  <div className="shrink-0 flex items-center gap-2">
                    {!selectMode ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addOne(idea);
                        }}
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                        title="このアイディアを追加"
                      >
                        追加
                      </button>
                    ) : null}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteIdea(idea);
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
            );
          })}
        </ul>
      </section>

      {/* 選択モード時の固定フッター */}
      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 bg-white/90 border-t">
          <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedIds.size} 件選択中
            </div>
            <button
              onClick={addSelected}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
