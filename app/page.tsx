"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Clock, Shuffle } from "lucide-react";

type Idea = { id: string; title: string; tags?: string[]; duration?: number };

// 英語タグ→日本語ラベル
const TAG_JA: Record<string, string> = {
  outdoor: "屋外",
  indoor: "屋内",
  kids: "子ども",
  craft: "工作",
  nature: "自然",
  free: "無料",
  relax: "リラックス",
  learning: "学び",
  budget: "節約",
  walk: "散歩",
  refresh: "リフレッシュ",
};

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const list: Idea[] = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");
    setBookmarkedIds(new Set(list.map((x) => x.id)));
    setBookmarkCount(list.length);
  }, []);

  async function fetchIdeas(body: any) {
    setLoading(true);
    setError(null);
    setIdeas([]);
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("APIエラー: " + res.status);
      const json = await res.json();
      setIdeas(json.ideas ?? []);
    } catch (e: any) {
      setError(e?.message ?? "不明なエラー");
    } finally {
      setLoading(false);
    }
  }

  async function onRandomClick() {
    await fetchIdeas({ random: true });
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      outcome: data.get("outcome") || "",
      mood: data.get("mood") || "",
      party: data.get("party") || "",
    };
    await fetchIdeas(payload);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleBookmark(item: Idea) {
    const list: Idea[] = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) list.push(item);
    else list.splice(idx, 1);
    localStorage.setItem("bookmarks", JSON.stringify(list));
    const nextIds = new Set(list.map((x) => x.id));
    setBookmarkedIds(nextIds);
    setBookmarkCount(list.length);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50 to-white text-slate-900">
      {/* ヒーロー */}
      <section className="mx-auto max-w-6xl px-6 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">今日なにする？</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-700">
          気分と目的を選ぶか、ランダムにおまかせ。あなたに合う「やってみたい」が、すぐに見つかります。
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          {/* ランダム */}
          <button
            onClick={onRandomClick}
            className="inline-flex w-44 sm:w-48 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="ランダムに提案を受け取る"
          >
            <Shuffle className="h-5 w-5" />
            ランダム
          </button>

          {/* タイムライン（等幅に） */}
          <a
            href="/plan"
            className="inline-flex w-44 sm:w-48 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-6 py-3 font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            title="タイムラインへ"
          >
            <Clock className="h-5 w-5" />
            タイムライン
          </a>
        </div>
      </section>

      {/* 条件フォーム（指定なし対応） */}
      <section
        id="plan"
        className="mx-auto mb-10 max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm"
      >
        <form ref={formRef} onSubmit={onSubmit} className="grid gap-5">
          <label className="grid gap-1">
            <span className="text-sm font-medium">得たいこと</span>
            <select
              name="outcome"
              defaultValue=""
              className="h-11 rounded-xl border px-3 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">指定なし</option>
              <option value="smile">笑顔になりたい</option>
              <option value="refresh">リフレッシュしたい</option>
              <option value="learning">学びたい</option>
              <option value="achievement">達成感ほしい</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">気分</span>
            <select
              name="mood"
              defaultValue=""
              className="h-11 rounded-xl border px-3 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">指定なし</option>
              <option value="outdoor">屋外でアクティブ</option>
              <option value="indoor">屋内でのんびり</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">誰と？</span>
            <select
              name="party"
              defaultValue=""
              className="h-11 rounded-xl border px-3 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">指定なし</option>
              <option value="solo">ひとり</option>
              <option value="family">家族</option>
              <option value="partner">パートナー</option>
              <option value="friends">友人</option>
            </select>
          </label>

          {/* 考える */}
          <button
            type="submit"
            className="mt-1 w-full sm:w-auto min-w-40 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "考え中…" : "考える"}
          </button>

          {/* フォーム下のタイムライン（同幅）＋バッジ */}
          <a
            href="/plan"
            className="inline-flex w-full sm:w-auto min-w-40 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            title="タイムラインへ"
          >
            <Clock className="h-5 w-5" />
            タイムライン
            {bookmarkCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-xs text-white">
                {bookmarkCount}
              </span>
            )}
          </a>

          {error && (
            <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-3">{error}</p>
          )}
        </form>
      </section>

      {/* 結果カード（タグ=日本語で表示） */}
      <section id="results" className="mx-auto max-w-4xl px-6 pb-16">
        {ideas.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {ideas.map((i) => {
              const active = bookmarkedIds.has(i.id);
              return (
                <li
                  key={i.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
                >
                  <h3 className="text-lg font-semibold">{i.title}</h3>
                  {/* タグ（日本語） */}
                  {i.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {i.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs rounded-full border border-slate-300 bg-indigo-50 px-2.5 py-1 text-indigo-800"
                        >
                          {TAG_JA[t] ?? t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-600">所要目安：{i.duration ?? 60}分</p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => toggleBookmark(i)}
                      className={
                        "rounded-full border p-2 hover:bg-slate-50 " +
                        (active ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "")
                      }
                      aria-pressed={active}
                      title={active ? "ブックマーク済み" : "ブックマーク"}
                    >
                      <Bookmark className="h-5 w-5" />
                    </button>
                    <a
                      href="/plan"
                      className="rounded-full border p-2 hover:bg-slate-50"
                      title="タイムラインで見る"
                    >
                      <Clock className="h-5 w-5" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && ideas.length === 0 && (
          <p className="text-sm text-slate-600">「ランダム」か「考える」で候補を表示します。</p>
        )}
      </section>
    </main>
  );
}
