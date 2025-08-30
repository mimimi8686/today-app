// components/NavMenu.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Home } from "lucide-react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  // ESCや戻るで閉じる
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="メニュー"
      >
        <Home className="h-5 w-5" /><span className="hidden sm:inline">メニュー</span>
      </button>

      {/* オーバーレイ */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <nav
            className="absolute inset-y-0 right-0 w-[85%] max-w-[360px] bg-white shadow-xl
                       animate-[slideIn_.18s_ease-out] will-change-transform"
            style={{ boxShadow: "-8px 0 24px rgba(0,0,0,.15)" }}
          >
            <style jsx global>{`
              @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="text-lg font-semibold">メニュー</span>
              <button onClick={() => setOpen(false)} className="text-sm underline">閉じる</button>
            </div>

            <ul className="p-3">
              {[
                { href: "/", label: "TOP" },
                { href: "/", label: "アイディア" },    // TOP=アイディア一覧なので同じ遷移でOK
                { href: "/history", label: "履歴" },
              ].map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-4 text-xl hover:bg-gray-50 active:bg-gray-100"
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
