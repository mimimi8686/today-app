"use client";

import { useState } from "react";
import { Bookmark, Check } from "lucide-react";

export default function SaveIdeaButton({ title }: { title: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false); // ← 保存したらチェック表示のまま

  async function onClick() {
    if (saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "保存に失敗しました");
      setSaved(true);
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={saving || saved}
      className={
        "rounded-full border p-2 transition " +
        (saved
          ? "border-emerald-500 bg-white text-emerald-700"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50")
      }
      title={saved ? "保存済み" : "このアイデアを保存"}
      aria-pressed={saved}
    >
      {saved ? <Check className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
    </button>
  );
}
