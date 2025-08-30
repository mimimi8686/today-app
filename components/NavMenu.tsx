// components/NavMenu.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, X } from "lucide-react";
import { createPortal } from "react-dom";

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ESC で閉じる & 背景スクロール固定
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const Overlay = (
    <div className="fixed inset-0 z-40">
      {/* 背景：タップで閉じる */}
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
      {/* 左からスライド（幅70%） */}
      <nav
        role="dialog" aria-modal="true"
        className="absolute inset-y-0 left-0 z-50 h-full
                   w-[70%] max-w-none md:max-w-[480px]
                   bg-white shadow-xl rounded-r-2xl
                   flex flex-col
                   animate-[slideIn_.18s_ease-out] will-change-transform"
      >
        <style jsx global>{`
          @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        `}</style>

        <div className="flex items-center justify-end px-4 py-3 border-b">
          <button onClick={() => setOpen(false)} aria-label="閉じる" className="rounded p-1 hover:bg-gray-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-0">
          {[
            { href: "/", label: "今日なにする？" },
            { href: "/saved", label: "保存したアイディア" },
            { href: "/history", label: "保存したタイムライン" },
            { href: "/plan", label: "今日のタイムライン" },
          ].map(m => (
            <li key={m.href} className="border-b first:border-t">
              <Link
                href={m.href}
                onClick={() => setOpen(false)}
                className="block px-6 py-5 text-xl font-medium hover:bg-gray-50 active:bg-gray-100"
              >
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* トリガー（ヘッダーに置く） */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
        aria-haspopup="dialog" aria-expanded={open} title="メニュー"
      >
        <Home className="h-5 w-5" />
        <span className="hidden sm:inline">メニュー</span>
      </button>

      {/* Portal：body直下に出す（ヘッダーのレイアウトの影響を受けない） */}
      {mounted && open && createPortal(Overlay, document.body)}
    </>
  );
}
