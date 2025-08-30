// components/SaveIdeaButton.tsx
"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

export default function SaveIdeaButton({ title }: { title: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onClick() {
    if (saving) return;
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
      setTimeout(() => setSaved(false), 1500); // 1.5秒で元に戻す（継続点灯にしたいなら消してください）
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={
        "rounded-full border p-2 transition " +
        (saved
          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50")
      }
      title={saved ? "保存しました" : "このアイデアを保存"}
      aria-pressed={saved}
    >
      <Bookmark className="h-5 w-5" />
    </button>
  );
}
