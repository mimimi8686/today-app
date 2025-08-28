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

// URLに入れる安全なBase64(JSON)エンコード/デコード
function encodePlan(data: unknown) {
  const json = JSON.stringify(data);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json).toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodePlan(b64: string) {
  try {
    const s = b64.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window === "undefined"
        ? Buffer.from(s, "base64").toString()
        : decodeURIComponent(escape(atob(s)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function PlanPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [loaded, setLoaded] = useState(false);

  // 任意カード入力
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState<number>(60);

  // 初回ロード：共有リンク (?t=...) があれば優先、なければ localStorage("bookmarks")
  useEffect(() => {
    try {
      const q =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const encoded = q?.get("t");
      if (encoded) {
        const payload = decodePlan(encoded) as { items?: Item[]; startTime?: string } | null;
        if (payload?.items?.length) {
          setItems(payload.items.map((x) => ({ ...x, duration: x.duration ?? 60 })));
          if (payload.startTime) setStartTime(payload.startTime);
          history.replaceState(null, "", window.location.pathname);
          setLoaded(true);
          return;
        }
      }
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
    const safe = Number.isFinite(dur) ? dur : 60;
    next[index] = {
      ...next[index],
      // 下限を 1 に、上限は 600 のまま
      duration: Math.max(1, Math.min(safe, 600)),
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
    const dur = Math.max(1, Math.min(Number.isFinite(newDuration) ? newDuration : 60, 600));
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
  

  // テキストコピー
  async function copyTimelineAsText() {
    if (timeline.length === 0) {
      alert("タイムラインが空です");
      return;
    }
    const lines: string[] = [];
    lines.push(`今日のタイムライン（開始 ${startTime} / 終了 ${endTime} / 合計 ${totalMinutes}分）`);
    for (const it of timeline) {
      const from = minutesToHHMM(it.from!);
      const to = minutesToHHMM(it.to!);
      const dur = it.duration ?? 0;
      lines.push(`- ${from} → ${to}\t${it.title}（${dur}分）`);
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("タイムラインをコピーしました（テキスト）");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("タイムラインをコピーしました（テキスト）");
    }
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
          {/* 右上の要約ピル → px-6を削除して右端にそろえる */}
          <div className="flex items-center justify-end gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              開始 {startTime}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
              終了 {endTime}
            </span>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-6">
        {/* タイトル行：左=見出し / 右=すべてクリア */}
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

        {/* 開始時刻＋追加項目＋所要時間 */}
        <div className="mt-3 grid grid-cols-[70px_1fr] items-center gap-x-3 gap-y-2">
          <label htmlFor="start-time" className="text-sm text-gray-700">
            開始時刻：
          </label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => {
              const v = e.target.value || "09:00";
              if (!/^\d{2}:\d{2}$/.test(v)) return;
              setStartTime(v);
            }}
            className="h-10 w-[110px] rounded-md border px-2"
          />

          <label htmlFor="new-title" className="text-sm text-gray-700">
            追加項目：
          </label>
          <input
            id="new-title"
            type="text"
            placeholder="やること（例：ランチ）"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-10 w-full min-w-0 rounded-md border px-3"
          />

          <label htmlFor="new-duration" className="text-sm text-gray-700">
            所要時間：
          </label>
          <div className="flex items-center gap-2">
            <input
              id="new-duration"
              type="number"
              min={1}
              max={600}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              className="h-10 w-24 rounded-md border px-2"
            />
            <button
              onClick={addCustomItem}
              className="h-10 shrink-0 rounded-md bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700"
            >
              追加
            </button>
          </div>
        </div>

        {/* タイムライン本体 */}
        {items.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            まだブックマークや予定がありません。TOPで🔖するか、上で追加してね。
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDrag}>
            <Droppable droppableId="timeline">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  <ul className="mt-5 grid gap-3">
                    {timeline.map((item, i) => (
                      <Draggable
                        key={String(item.id)}
                        draggableId={String(item.id)}
                        index={i}
                      >
                        {(prov) => (
                          <li
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                          >
                            {/* 時刻ピル */}
                            <div className="text-sm font-medium">
                              <span className="inline-flex items-center rounded-md border border-emerald-100 bg-emerald-50/70 px-2 py-0.5 text-emerald-700">
                                {minutesToHHMM(item.from!)} → {minutesToHHMM(item.to!)}
                              </span>
                            </div>

                            {/* タイトル */}
                            <h3 className="mt-0.5 text-lg font-semibold">{item.title}</h3>

                            {/* 操作 */}
                            <div className="mt-2 flex items-center justify-end gap-3">
                              <label className="text-xs text-gray-600">
                                所要（分）
                                <input
                                  type="number"
                                  min={1}
                                  max={600}
                                  value={item.duration ?? 60}
                                  onChange={(e) =>
                                    updateDuration(i, Number(e.target.value))
                                  }
                                  className="ml-2 h-9 w-24 rounded-md border px-2"
                                />
                              </label>
                              <button
                                onClick={() => removeItem(i)}
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
                  </ul>

                  {provided.placeholder}

                  {/* 終了フッター（Droppableコンテナ内のままでOK） */}
                  <div className="mt-6 flex items-center">
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
                    <div className="mx-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-700">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">終了 {endTime}</span>
                      <span className="hidden sm:inline text-sky-700/80">
                        （合計 {totalMinutes}分）
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-300 via-gray-200 to-transparent" />
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* 共有フッター */}
        <div className="mx-auto max-w-5xl px-6">
          <div className="mt-8 flex flex-wrap items-center justify-end gap-3 sm:justify-between">
            <div className="hidden sm:block text-sm text-gray-500">
              共有して友だちと一緒に計画しよう！
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (items.length === 0) {
                    alert("タイムラインが空です");
                    return;
                  }
                  const t = encodePlan({ items, startTime });
                  const url = `${location.origin}/plan?t=${t}`;
                  await navigator.clipboard.writeText(url);
                  alert("共有リンクをコピーしました！");
                }}
                className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-amber-700 hover:bg-amber-100"
                title="共有リンクをコピー"
              >
                共有
              </button>
              
              <button
                onClick={async () => {
                  if (items.length === 0) {
                    alert("タイムラインが空です");
                    return;
                  }
                  await copyTimelineAsText();
                }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                title="テキストでコピー"
              >
                コピー
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
