// components/NavMenu.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, X } from "lucide-react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* トリガー（ヘッダー左上などに置く用） */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="メニュー"
      >
        <Home className="h-5 w-5" />
        <span className="hidden sm:inline">メニュー</span>
      </button>

      {/* オーバーレイ + フルスクリーンパネル */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* 背景 */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* パネル（右から全画面） */}
          <aside
            className="absolute inset-0 bg-white animate-[slideIn_.18s_ease-out] will-change-transform"
            role="dialog"
            aria-label="メニュー"
          >
            <style jsx global>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to   { transform: translateX(0); }
              }
            `}</style>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <span className="text-xl font-semibold">メニュー</span>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* リスト（指で押しやすい大きさ） */}
            <nav className="px-4 py-3">
              {[
                { href: "/", label: "TOP" },
                { href: "/", label: "アイディア" },     // TOP=アイディア一覧なので同じ
                { href: "/history", label: "履歴" },
              ].map((m) => (
                <Link
                  key={m.href + m.label}
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-5 py-5 text-2xl hover:bg-gray-50 active:bg-gray-100"
                >
                  {m.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
