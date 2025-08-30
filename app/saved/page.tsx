"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import NavMenu from "@/components/NavMenu";

// URLに入れる安全なBase64(JSON)エンコード（history と同じ流儀）
function encodePlan(data: unknown) {
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ideas", { cache: "no-store" });
        const text = await res.text();
        let j: any = {};
        if (text) { try { j = JSON.parse(text); } catch {} }
        if (!res.ok) {
          setError(j?.error ?? `読み込みに失敗しました (HTTP ${res.status})`);
        } else {
          // /api/ideas の戻りが {items:[...]} or 配列 どちらでも吸収
          const list = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
          setItems(list);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // カードをタップ → そのアイディア1件だけのタイムラインを開く
  function openAsTimeline(idea: Idea) {
    const t = encodePlan({
      startTime: "09:00",
      items: [{ id: idea.id, title: idea.title, duration: 60 }],
    });
    router.push(`/plan?t=${t}`);
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
  }

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

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <NavMenu />
          <h1 className="text-xl sm:text-2xl font-bold">保存したアイディア</h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-6">
        {loading && <p className="text-gray-500">読み込み中…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-gray-500">保存されたアイディアはまだありません。</p>
        )}

        <ul className="grid gap-3">
          {items.map((idea) => (
            <li
              key={idea.id}
              className="rounded-xl border bg-white p-4 shadow-sm hover:shadow cursor-pointer"
              onClick={() => openAsTimeline(idea)}
              title="タップでタイムラインに呼び出す"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{idea.title}</h3>
                  <div className="mt-1 text-sm text-gray-600">保存日時：{fmt(idea.created_at)}</div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
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
          ))}
        </ul>
      </section>
    </main>
  );
}
