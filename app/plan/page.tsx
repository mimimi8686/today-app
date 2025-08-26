"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Trash2, Clock, Home } from "lucide-react";

type Item = { id: string; title: string; duration?: number; tags?: string[] };

function minutesToHHMM(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function PlanPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [loaded, setLoaded] = useState(false);

  // 任意カード入力
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState<number>(60);

  // 初回ロード：localStorage → state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bookmarks");
      const list: Item[] = raw ? JSON.parse(raw) : [];
      setItems(list.map((x) => ({ ...x, duration: x.duration ?? 60 })));
    } catch {
      localStorage.removeItem("bookmarks");
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  // 以後の変更だけ保存
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("bookmarks", JSON.stringify(items));
  }, [items, loaded]);

  const totalMinutes = useMemo(() => items.reduce((s, it) => s + (it.duration ?? 0), 0), [items]);

  const timeline = useMemo(() => {
    const [h, m] = startTime.split(":").map((n) => parseInt(n, 10));
    let cursor = h * 60 + m;
    return items.map((it) => {
      const dur = it.duration ?? 0;
      const from = cursor;
      const to = cursor + dur;
      cursor = to;
      return { ...it, from, to };
    });
  }, [items, startTime]);

  const endTime = useMemo(() => {
    const [h, m] = startTime.split(":").map((n) => parseInt(n, 10));
    return minutesToHHMM(h * 60 + m + totalMinutes);
  }, [startTime, totalMinutes]);

  function handleDrag(result: DropResult) {
    if (!result.destination) return;
    const next = Array.from(items);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setItems(next);
  }

  function updateDuration(index: number, dur: number) {
    const next = [...items];
    next[index] = {
      ...next[index],
      duration: Math.max(5, Math.min(Number.isFinite(dur) ? dur : 60, 600)),
    };
    setItems(next);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function clearAll() {
    setItems([]);
    localStorage.setItem("bookmarks", JSON.stringify([]));
  }

  function addCustomItem() {
    const title = newTitle.trim();
    const dur = Math.max(5, Math.min(Number.isFinite(newDuration) ? newDuration : 60, 600));
    if (!title) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const item: Item = { id, title, duration: dur };
    setItems((prev) => [...prev, item]);
    setNewTitle("");
    setNewDuration(60);
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* ヘッダー（ナビ＋要約） */}
      <header className="px-6 py-4 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-white"
            title="TOPへ"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">TOP</span>
          </Link>
          {/* 右上の要約ピル */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 border border-emerald-200">
              合計 {totalMinutes}分
            </span>
            <span className="rounded-full bg-sky-50 text-sky-700 px-3 py-1 border border-sky-200">
              終了 {endTime}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        {/* タイトル */}
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-emerald-600" />
          今日のタイムライン
        </h1>

        {/* --- Group 1: スケジュール設定 --- */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">スケジュール設定</h2>
            <button
              onClick={clearAll}
              className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              title="全部消す"
            >
              すべてクリア
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-sm">
              開始時刻：
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  const v = e.target.value || "09:00";
                  if (!/^\d{2}:\d{2}$/.test(v)) return;
                  setStartTime(v);
                }}
                className="ml-2 h-10 rounded-lg border px-3"
              />
            </label>
          </div>
        </div>

        {/* --- Group 2: 予定の追加 --- */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">予定を追加</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_120px]">
            <input
              type="text"
              placeholder="やることを入力（例：スーパーで買い出し）"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-11 rounded-lg border px-3"
            />
            <label className="flex items-center gap-2">
              <span className="text-sm text-gray-600">所要（分）</span>
              <input
                type="number"
                min={5}
                max={600}
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="h-11 w-24 rounded-lg border px-2"
              />
            </label>
            <button
              onClick={addCustomItem}
              className="h-11 rounded-lg bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700"
            >
              追加
            </button>
          </div>
        </div>

        {/* --- Group 3: タイムライン --- */}
        {items.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            まだブックマークや予定がありません。TOPで🔖してから、または上で追加してね。
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDrag}>
            <Droppable droppableId="timeline">
              {(provided) => (
                <ul
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="mt-6 grid gap-4"
                >
                  {timeline.map((it, idx) => (
                    <Draggable key={String(it.id)} draggableId={String(it.id)} index={idx}>
                      {(prov) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                          {/* 上段：時間 */}
                          <div className="text-xs text-gray-500">{minutesToHHMM(it.from!)} → {minutesToHHMM(it.to!)}</div>
                          {/* 中段：タイトル */}
                          <h3 className="mt-1 text-lg font-semibold">{it.title}</h3>
                          {/* 下段：操作 */}
                          <div className="mt-3 flex items-center justify-end gap-3">
                            <label className="text-xs text-gray-600">
                              所要（分）
                              <input
                                type="number"
                                min={5}
                                max={600}
                                value={it.duration ?? 60}
                                onChange={(e) => updateDuration(idx, Number(e.target.value))}
                                className="ml-2 w-24 h-10 rounded-lg border px-2"
                              />
                            </label>
                            <button
                              onClick={() => removeItem(idx)}
                              className="rounded-full border p-2 hover:bg-gray-50"
                              title="削除"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>
    </main>
  );
}
