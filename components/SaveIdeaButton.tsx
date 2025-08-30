// components/SavedIdeaButton.tsx
"use client";

import { useState } from "react";

export default function SavedIdeaButton({ title }: { title: string }) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function onClick() {
    if (saving) return;
    setSaving(true);
    setDone(false);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "保存に失敗しました");
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={onClick}
      className={"rounded-full border p-2 text-gray-600 hover:bg-gray-50 " + (done ? "bg-emerald-50 text-emerald-700" : "")}
      title="このアイデアを保存"
      aria-label="このアイデアを保存"
    >
      {done ? "✔️" : "🔖"}
    </button>
  );
}
