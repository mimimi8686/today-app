// components/NavMenu.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Home, X } from "lucide-react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  // ESCで閉じる + 背景スクロール固定
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    window.addEventListener("keydown", onKey);
    if (open) document.body.classList.add("overflow-hidden");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, closeMenu]);

  return (
    <>
      {/* トリガー */}
      <button
        onClick={openMenu}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="メニュー"
      >
        <Home className="h-5 w-5" />
        <span className="hidden sm:inline">メニュー</span>
      </button>

      {/* オーバーレイ + 左スライドパネル */}
      {open && (
        <div className="fixed inset-0 z-[100]">
          {/* 背景 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* パネル（全高） */}
          <nav
            className="
              absolute inset-y-0 left-0 z-[101]
              h-full w-full max-w-[420px] bg-white shadow-xl
              flex flex-col
              animate-[slideInLeft_.18s_ease-out]
            "
            role="dialog"
            aria-modal="true"
          >
            <style jsx global>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to   { transform: translateX(0%); }
              }
            `}</style>

            {/* 上：閉じる（「メニュー」文字は無し） */}
            <div className="flex items-center justify-end px-4 py-4">
              <button
                onClick={closeMenu}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="閉じる"
                title="閉じる"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 本体：flex-1 で全高の残り、ここだけスクロール */}
            <div className="flex-1 overflow-y-auto">
              <ul>
                {[
                  { href: "/", label: "TOP" },
                  { href: "/", label: "アイディア" },   // TOPと同じ
                  { href: "/history", label: "履歴" },
                ].map((m, i) => (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={closeMenu}
                      className="block w-full px-6 py-6 text-2xl font-medium hover:bg-gray-50 active:bg-gray-100"
                    >
                      {m.label}
                    </Link>
                    {i < 2 && <div className="h-px w-full bg-gray-200" />}
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
