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

      <section className="mx-auto max-w-5xl px-6 py-6">
        {/* タイトル行：左=見出し / 右=すべてクリア（やや目立つ） */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold whitespace-nowrap">
            <Clock className="h-6 w-6 text-emerald-600" />
            今日のタイムライン
          </h1>
          <button
            onClick={clearAll}
            className="shrink-0 inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
            title="全部消す"
          >
            すべてクリア
          </button>
        </div>

        {/* サブツールバー：開始時刻（最下位・コンパクト） */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-700">
          <label className="inline-flex items-center gap-2">
            開始時刻：
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                const v = e.target.value || "09:00";
                if (!/^\d{2}:\d{2}$/.test(v)) return;
                setStartTime(v);
              }}
              className="h-9 rounded-md border px-2"
            />
          </label>
        </div>

        {/* 入力行：横並び1行（スマホでは自動で折り返し） */}
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_120px]">
        {/* 1行目：タイトル */}
        <input
          type="text"
          placeholder="やること（例：スーパーで買い出し）"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="h-10 rounded-md border px-3"
        />

        {/* 2行目：所要＋追加（モバイル時は横並び・sm以上ではグリッドの2/3列に展開） */}
        <div className="flex gap-2 sm:contents">
          <input
            type="number"
            min={5}
            max={600}
            value={newDuration}
            onChange={(e) => setNewDuration(Number(e.target.value))}
            className="h-10 w-[120px] rounded-md border px-2 sm:w-auto"
            placeholder="所要（分）"
          />
          <button
            onClick={addCustomItem}
            className="h-10 rounded-md bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700"
          >
            追加
          </button>
        </div>
      </div>

        {/* タイムライン（主役。カードは少しだけ詰める） */}
        {items.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            まだブックマークや予定がありません。TOPで🔖するか、上で追加してね。
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDrag}>
            <Droppable droppableId="timeline">
              {(provided) => (
                <>
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="mt-5 grid gap-3"
                  >
                    {timeline.map((it, idx) => (
                      <Draggable key={String(it.id)} draggableId={String(it.id)} index={idx}>
                        {(prov) => (
                          <li
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                          >
                            {/* 時刻（少し強調） */}
                            <div className="text-sm font-medium">
                              <span className="inline-flex items-center rounded-md border border-emerald-100 bg-emerald-50/70 px-2 py-0.5 text-emerald-700">
                                {minutesToHHMM(it.from!)} → {minutesToHHMM(it.to!)}
                              </span>
                            </div>

                            {/* タイトル */}
                            <h3 className="mt-0.5 text-lg font-semibold">{it.title}</h3>

                            {/* 操作 */}
                            <div className="mt-2 flex items-center justify-end gap-3">
                              <label className="text-xs text-gray-600">
                                所要（分）
                                <input
                                  type="number"
                                  min={5}
                                  max={600}
                                  value={it.duration ?? 60}
                                  onChange={(e) => updateDuration(idx, Number(e.target.value))}
                                  className="ml-2 h-9 w-24 rounded-md border px-2"
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

                  {/* 終了フッター（カードの後ろ） */}
                  <div className="mt-6 flex items-center">
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
                    <div className="mx-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-700">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">終了 {endTime}</span>
                      <span className="hidden sm:inline text-sky-700/80">（合計 {totalMinutes}分）</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-300 via-gray-200 to-transparent" />
                  </div>
                </>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>

    </main>
  );
}
