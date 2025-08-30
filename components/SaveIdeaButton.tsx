"use client";
import { useEffect, useState } from "react";
import { Bookmark, Check } from "lucide-react";

type Props = { title: string };

export default function SaveIdeaButton({ title }: Props) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // 起動時に「すでに保存済みか」を判定してチェック表示にする
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/api/ideas", { cache: "no-store" });
        const text = await res.text();
        let j: any = {};
        if (text) { try { j = JSON.parse(text); } catch {} }
        const list = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
        const exists = list.some(
          (x: any) =>
            (x?.title ?? "").trim().toLowerCase() === title.trim().toLowerCase()
        );
        if (!canceled && exists) setDone(true);
      } catch {
        /* 失敗してもUIはそのまま */
      }
    })();
    return () => { canceled = true; };
  }, [title]);

  async function onClick() {
    if (busy || done) return;
    setDone(true);   // 先にチェック表示
    setBusy(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
  
      // API は { existed: true } を返すことがある
      const j = await res.json().catch(() => ({} as any));
  
      if (res.status === 201) {
        // 新規保存：必要なら通知
        // alert("保存しました！\n\n👉 保存したアイディア：/saved");
      } else if (res.ok && j?.existed) {
        // すでに保存済み
        // alert("すでに保存されています");
      } else {
        throw new Error(j?.error || "保存に失敗しました");
      }
    } catch (e: any) {
      // 失敗したら元に戻す
      setDone(false);
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
