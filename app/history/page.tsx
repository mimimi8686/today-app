"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavMenu from "@/components/NavMenu";

type IdeaRow = {
  id: string;
  title: string;
  tags: string[];
  duration_min: number;
  created_at: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ideas?limit=100&offset=0", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "failed");
        setItems(json.items || []);
      } catch (e: any) {
        setErr(e.message ?? "エラー");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <NavMenu />
        <h1 className="text-2xl font-bold">保存したアイデア</h1>
      </header>

      {loading && <div>読み込み中...</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && (
        <>
          {items.length === 0 ? (
            <p className="text-gray-500">まだ保存がありません</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <li key={it.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-gray-600">{it.tags?.join(", ")}</div>
                  <div className="text-xs text-gray-500">
                    所要時間: {it.duration_min}分 / {new Date(it.created_at).toLocaleString()}
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/plan"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                    >
                      タイムラインへ
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
