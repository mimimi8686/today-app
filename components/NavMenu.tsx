// components/NavMenu.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  // ESCで閉じる + 背景スクロールロック
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* トリガーボタン（ヘッダー左に置く想定） */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="メニュー"
      >
        <Menu className="h-5 w-5" />
        <span className="hidden sm:inline">メニュー</span>
      </button>

      {/* オーバーレイ + スライドパネル */}
      <div
        className={`fixed inset-0 z-[100] ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* 半透明の背景 */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        {/* 左からスライドする本体 */}
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 left-0 w-[85%] max-w-[360px] bg-white text-gray-900 transition-transform duration-200 ease-out
            ${open ? "translate-x-0" : "-translate-x-full"}`}
          style={{ boxShadow: "8px 0 24px rgba(0,0,0,.15)" }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <span className="text-xl font-bold">メニュー</span>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-2 hover:bg-gray-100"
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* リスト（大きく・押しやすく） */}
          <nav className="px-4 py-3">
            <ul className="grid gap-2">
              {[
                { href: "/", label: "TOP" },
                { href: "/", label: "アイディア" }, // TOP=アイディア一覧
                { href: "/history", label: "履歴" },
              ].map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-5 text-2xl font-semibold tracking-wide
                               bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
