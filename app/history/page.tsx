// app/history/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NavMenu from "@/components/NavMenu";


// URLに入れる安全なBase64(JSON)エンコード（plan/page.tsx と同等の簡易版）
function encodePlan(data: unknown) {
  const json = JSON.stringify(data);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json).toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type PlanItem = {
  id: string;
  title: string;
  created_at: string;
  payload: {
    startTime?: string;
    items?: { id: string; title: string; duration?: number }[];
  };
};

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // スワイプで開く削除ボタン幅(px)
  const DELETE_W = 80;

  // 現在スワイプ中/開いている行の情報
  const [swipe, setSwipe] = useState<{ id: string | null; x: number; open: boolean }>({
    id: null,
    x: 0,
    open: false,
  });

  // ドラッグ中フラグと開始位置
  const dragging = useRef(false);
  const startX = useRef(0);
  const moved = useRef(false); // スワイプで動いたか（タップ判定に使う）


  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plans", { cache: "no-store" });
  
        // 空レスポンスでも落ちないように first text → safe JSON
        const text = await res.text();
        let j: any = {};
        if (text) {
          try { j = JSON.parse(text); } catch { /* パース失敗でも j は {} のまま */ }
        }
  
        if (!res.ok) {
          setError(j?.error ?? `読み込みに失敗しました (HTTP ${res.status})`);
        } else {
          setItems(Array.isArray(j?.items) ? j.items : []);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function fmt(dt: string) {
    try {
      const d = new Date(dt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${y}/${m}/${day} ${h}:${mi}`;
    } catch {
      return dt;
    }
  }

  // ① 開く：/plan?t=... へ遷移
  function openPlan(p: PlanItem) {
    const items = (p.payload?.items ?? []).map(i => ({
      id: i.id, title: i.title, duration: i.duration ?? 60
    }));
    const startTime = p.payload?.startTime ?? "09:00";
    const t = encodePlan({ items, startTime });
    router.push(`/plan?t=${t}`);
  }
  function onPointerDown(e: React.PointerEvent, id: string) {
    // 別行を触ったら前の開きを閉じる
    setSwipe((s) => (s.id !== id ? { id, x: 0, open: false } : s));
  
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  
  function onPointerMove(e: React.PointerEvent, id: string) {
    if (!dragging.current || swipe.id !== id) return;
    const dx = e.clientX - startX.current;
    // 左へ：負の値で最大 -DELETE_W。右へは 0 まで（開いた状態から右に戻すのもOK）
    let nx = Math.min(0, Math.max(-DELETE_W, dx));
    // すでに open のときは、スタートを -DELETE_W とみなしてもう少し戻しやすく
    if (swipe.open) {
      const dx2 = e.clientX - startX.current;
      nx = Math.min(0, Math.max(-DELETE_W, -DELETE_W + dx2));
    }
    if (Math.abs(dx) > 6) moved.current = true;
    setSwipe((s) => ({ ...s, id, x: nx }));
  }
  
  function onPointerUp(e: React.PointerEvent, id: string) {
    if (swipe.id !== id) return;
    dragging.current = false;
  
    // しきい値でスナップ
    const open = swipe.x <= -DELETE_W * 0.6;
    setSwipe({ id, x: open ? -DELETE_W : 0, open });
  }
  
  function closeSwipe() {
    if (swipe.open || swipe.x !== 0) setSwipe({ id: null, x: 0, open: false });
  }
  
  async function saveTitle(p: PlanItem) {
    const name = editingTitle.trim();
    setEditingId(null);
    if (!name || name === p.title) return;
    await renamePlan(p, name);
    setEditingTitle("");
  } 
  // ② 名前変更（PATCH /api/plans/:id）
  // ▼置き換え
  async function renamePlan(p: PlanItem, newName?: string) {
    // newName が来ていなければ（「変更」ボタンからの呼び出し時だけ）prompt を使う
    const name = (newName ?? prompt("新しいタイトルを入力してください", p.title) ?? "").trim();

    // 編集モードを確実に閉じる
    setEditingId(null);
    setEditingTitle("");

    if (!name || name === p.title) return;

    const res = await fetch(`/api/plans`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id, title: name }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "更新に失敗しました");
      return;
    }

    // 画面の状態を更新
    setItems(prev => prev.map(x => (x.id === p.id ? { ...x, title: name } : x)));
  }


  // ③ 削除（DELETE /api/plans/:id）
  async function deletePlan(p: PlanItem) {
    if (!confirm(`「${p.title}」を削除します。よろしいですか？`)) return;
    const res = await fetch(`/api/plans`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "削除に失敗しました");
      return;
    }
    setItems(prev => prev.filter(x => x.id !== p.id));
  }  

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          {/* 左：メニュー */}
          <NavMenu />
          {/* 右：見出し */}
          <h1 className="text-xl sm:text-2xl font-bold">保存したタイムライン</h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-6">
        {loading && <p className="text-gray-500">読み込み中…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-500">
            まだ保存がありません。タイムラインを作成して保存するとここに表示されます。
          </p>
        )}

        <ul className="grid gap-3">
        {items.map((p) => {
          const isActive = swipe.id === p.id;
          const translate = isActive ? swipe.x : 0;

          return (
            <li key={p.id} className="relative overflow-hidden select-none">
              {/* 背面の削除ボタン（常に右端。手前のカードをスワイプすると見える） */}
              <button
                onClick={(e) => { e.stopPropagation(); deletePlan(p); }}
                className="absolute inset-y-0 right-0 w-20 bg-rose-600 text-white font-semibold"
                title="削除"
              >
                削除
              </button>

              {/* 手前のカード（これを左右にスワイプ） */}
              <div
                className={
                  "rounded-xl border bg-white p-4 shadow-sm " +
                  (isActive && dragging.current ? "" : " transition-transform duration-200")
                }
                style={{ transform: `translateX(${translate}px)`, touchAction: "pan-y" as any }}
                // スワイプ用のイベント
                onPointerDown={(e) => onPointerDown(e, p.id)}
                onPointerMove={(e) => onPointerMove(e, p.id)}
                onPointerUp={(e) => onPointerUp(e, p.id)}
                onPointerCancel={(e) => onPointerUp(e, p.id)}
                // タップで開く（スワイプで動いたときは開かない）
                onClick={() => { if (!moved.current) openPlan(p); }}
                title="タップで開く"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {/* タイトル：前ターンで入れた“クリックで編集”のブロックをそのまま置く */}
                    {editingId === p.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveTitle(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle(p);
                          if (e.key === "Escape") { setEditingId(null); setEditingTitle(""); }
                        }}
                        className="text-lg font-semibold border rounded px-2 py-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        className="text-left text-lg font-semibold"
                        onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditingTitle(p.title); }}
                        title="クリックで名前を編集"
                      >
                        {p.title}
                      </button>
                    )}

                    <div className="mt-1 text-sm text-gray-600">
                      保存日時：{fmt(p.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        </ul>
      </section>
    </main>
  );
}
