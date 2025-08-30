// components/NavMenu.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Home } from "lucide-react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ESCキーで閉じる
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 背景スクロールを止める
  useEffect(() => {
    const cls = "overflow-hidden";
    const el = document.documentElement;
    if (open) el.classList.add(cls);
    else el.classList.remove(cls);
  }, [open]);

  return (
    <>
      {/* トリガーボタン（右上に固定） */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-[60] inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-2 shadow backdrop-blur hover:bg-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="メニュー"
      >
        <Home className="h-5 w-5" />
        <span className="hidden sm:inline">メニュー</span>
      </button>

      {/* バックドロップ */}
      <div
        aria-hidden={!open}
        className={
          "fixed inset-0 z-50 transition-opacity " +
          (open ? "bg-black/40 opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={() => setOpen(false)}
      />

      {/* フルスクリーンスライドパネル */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={
          "fixed inset-0 z-[55] flex flex-col bg-white transition-transform duration-300 ease-out " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-xl font-bold">メニュー</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>

        {/* メニュー本体 */}
        <nav className="flex flex-1 flex-col justify-start gap-4 overflow-y-auto px-6 py-8">
          {[
            { href: "/", label: "TOP" },
            { href: "/", label: "アイディア" },
            { href: "/history", label: "履歴" },
          ].map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-2xl font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              {m.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
