// components/NavMenu.tsx
"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { Home, X } from "lucide-react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  // ESCで閉じる + 背景スクロール固定
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // bodyスクロール固定
    if (open) document.body.classList.add("overflow-hidden");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const openMenu = useCallback(() => setOpen(true), []);

  return (
    <>
      {/* トリガーボタン（ヘッダー右や左に自由に置けます） */}
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

      {/* オーバーレイ + パネル */}
      {open && (
        <div className="fixed inset-0 z-[100]">
          {/* 背景（全面・半透明） */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden="true"
          />

          {/* 左からスライドするパネル（全高） */}
          <nav
            className="
              absolute inset-y-0 left-0 h-full w-full max-w-[420px]
              bg-white shadow-xl outline-none
              animate-[slideInLeft_.18s_ease-out]
            "
            role="dialog"
            aria-modal="true"
          >
            {/* アニメーション定義（グローバル） */}
            <style jsx global>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to   { transform: translateX(0%); }
              }
            `}</style>

            {/* 上部：閉じるボタンだけ（「メニュー」文字は無し） */}
            <div className="flex items-center justify-end px-4 py-4">
              <button
                onClick={close}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="閉じる"
                title="閉じる"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* メニュー本体：隙間なし・全高（スクロール可） */}
            <ul className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto">
              {[
                { href: "/", label: "TOP" },
                { href: "/", label: "アイディア" }, // TOPと同じでOK
                { href: "/history", label: "履歴" },
              ].map((m, idx) => (
                <li key={m.href} className="flex-0">
                  <Link
                    href={m.href}
                    onClick={close}
                    className="
                      block w-full px-6 py-6
                      text-2xl font-medium
                      hover:bg-gray-50 active:bg-gray-100
                    "
                  >
                    {m.label}
                  </Link>
                  {/* セパレーター。行間の“余白”は作らず、線のみで区切る */}
                  {idx < 2 && <div className="h-px w-full bg-gray-200" />}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
