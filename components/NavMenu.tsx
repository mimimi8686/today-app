"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Home, Bookmark } from "lucide-react"; // ← 追加

export default function NavMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
        title="メニュー"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <Home className="h-5 w-5" />
        <span className="hidden sm:inline">メニュー</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 opacity-70">
          <path d="M5.25 7.5 10 12.25 14.75 7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute z-50 mt-2 w-40 rounded-lg border bg-white py-1 shadow-lg"
        >
          <Link
            href="/"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            TOP
          </Link>

          <Link
            href="/saved"                                  // ← 追加
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            <span className="inline-flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              保存一覧
            </span>
          </Link>

          <Link
            href="/history"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            履歴
          </Link>
        </div>
      )}
    </div>
  );
}
