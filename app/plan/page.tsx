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
  // ← すべて「コンポーネント内」に置く
  const [items, setItems] = useState<Item[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [loaded, setLoaded] = useState(false);

  // 任意カードの入力用 state（★追加）
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

  // 以後の変更だけ保存（初回は書き込まない）
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("bookmarks", JSON.stringify(items));
  }, [items, loaded]);

  const totalMinutes = useMemo(
    () => items.reduce((s, it) => s + (it.duration ?? 0), 0),
    [items]
  );

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

  function sortByDurationAsc() {
    setItems((prev) => [...prev].sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0)));
  }

  function clearAll() {
    setItems([]);
    localStorage.setItem("bookmarks", JSON.stringify([]));
  }

  // ★ 任意カードの追加
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
      {/* ヘッダー */}
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
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="hidden md:flex items-center gap-1">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>開始 {startTime}</span>
            </div>
            <span>終了 {endTime}</span>
            <span>合計 {totalMinutes}分</span>
          </div>
        </div>
      </header>

      {/* コントロール */}
      <section className="mx-auto max-w-5xl px-6 py-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-emerald-600" />
          今日のタイムライン
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3">
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
              className="ml-2 rounded-lg border px-2 py-1"
            />
          </label>
          <button onClick={sortByDurationAsc} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-white">
            自動並べ替え（短い順）
          </button>
          <button onClick={clearAll} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-white">
            すべてクリア
          </button>
          <span className="ml-auto text-sm text-gray-600">
            合計 {totalMinutes}分 ／ 終了 {endTime}
          </span>
        </div>

        {/* ★ 任意カードの入力フォーム */}
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_120px]">
          <input
            type="text"
            placeholder="やることを入力（例：スーパーで買い出し）"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded-lg border px-3 py-2"
          />
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-600">所要（分）</span>
            <input
              type="number"
              min={5}
              max={600}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              className="w-24 rounded-lg border px-2 py-2"
            />
          </label>
          <button
            onClick={addCustomItem}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
          >
            追加
          </button>
        </div>

        {/* タイムライン（DnD） */}
        {items.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            まだブックマークがありません。TOPで「ブックマーク」してから戻ってきてね。
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDrag}>
            <Droppable droppableId="timeline">
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef} className="mt-6 grid gap-4">
                  {timeline.map((it, idx) => (
                    <Draggable key={String(it.id)} draggableId={String(it.id)} index={idx}>
                      {(prov) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="grid gap-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[120px_1fr_160px]"
                        >
                          <div className="text-sm text-gray-600 md:self-center">
                            {minutesToHHMM(it.from!)} → {minutesToHHMM(it.to!)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{it.title}</h3>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <label className="text-xs text-gray-600">
                              所要（分）
                              <input
                                type="number"
                                min={5}
                                max={600}
                                value={it.duration ?? 60}
                                onChange={(e) => updateDuration(idx, Number(e.target.value))}
                                className="ml-2 w-20 rounded-lg border px-2 py-1"
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
