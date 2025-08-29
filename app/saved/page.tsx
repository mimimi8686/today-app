"use client";
import { useEffect, useState } from "react";

type IdeaRow = {
  id: string;
  title: string;
  tags: string[];
  duration_min: number;
  created_at: string;
};

export default function SavedPage() {
  const [items, setItems] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ideas?limit=100&offset=0", {
          cache: "no-store",
        });
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

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">保存したアイデア</h1>
      {items.length === 0 && <p className="text-gray-500">まだ保存がありません</p>}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="p-3 rounded border">
            <div className="font-medium">{it.title}</div>
            <div className="text-sm text-gray-600">{it.tags?.join(", ")}</div>
            <div className="text-xs text-gray-500">
              所要時間: {it.duration_min}分 / {new Date(it.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
