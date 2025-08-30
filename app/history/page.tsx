// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavMenu from "@/components/NavMenu"; // ← 追加！

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
  const [items, setItems] = useState<PlanItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plans", { credentials: "include", cache: "no-store" });
        const j = await res.json();
        if (!res.ok) {
          setError(j?.error ?? "読み込みに失敗しました");
        } else {
          setItems(Array.isArray(j?.items) ? j.items : []);
        }
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
    } catch {
      return dt;
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          {/* 左：メニュー（←ここを NavMenu に差し替え） */}
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
          {items.map((p) => {
            const count = p.payload?.items?.length ?? 0;
            const start = p.payload?.startTime ?? "—";
            return (
              <li key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <div className="mt-1 text-sm text-gray-600">
                      保存日時：{fmt(p.created_at)} / 開始：{start} / 件数：{count}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
