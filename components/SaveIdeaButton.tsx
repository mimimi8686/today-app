"use client";
import { useState } from "react";
import { Bookmark, Check } from "lucide-react";

type Props = { title: string };

export default function SaveIdeaButton({ title }: Props) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy || done) return;
    setDone(true);          // 先にチェック表示
    setBusy(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "保存に失敗しました");
      }
    } catch (e: any) {
      setDone(false); // 失敗なら元に戻す
      alert(e?.message || "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={done ? "保存済み" : "保存"}
      title={done ? "保存済み" : "保存"}
      className={
        "inline-flex h-10 w-10 items-center justify-center rounded-full border transition " +
        (done
          ? "border-emerald-400 bg-white text-emerald-700"
          : "border-gray-300 bg-white hover:bg-gray-50")
      }
    >
      {done ? <Check className="h-6 w-6" /> : <Bookmark className="h-6 w-6" />}
    </button>
  );
}
