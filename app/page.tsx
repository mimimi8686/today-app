"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Clock, Shuffle } from "lucide-react";

type Idea = { id: string; title: string; tags?: string[]; duration?: number };

const TAG_LABELS: Record<string, string> = {
  indoor: "屋内", outdoor: "屋外", kids: "子ども向け", craft: "工作", nature: "自然",
  free: "無料", relax: "リラックス", learning: "学び", budget: "低予算", walk: "散歩", refresh: "リフレッシュ",
};

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 6; // 1ページの取得件数s
  const [offset, setOffset] = useState(0);           // 非ランダム用
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set()); // ランダム用
  const [hasMore, setHasMore] = useState(false);
  // 直近の検索条件を保持（もっと見る で再利用）
  const [lastQuery, setLastQuery] = useState<Record<string, unknown>>({});


    // APIの1件分
  type IdeaFromApi = {
    id: string;
    title: string;
    durationMin: number;
    tags: string[];
  };
  type ApiResponse = {
    ideas?: Idea[];
    hasMore?: boolean;
    total?: number;
  };
  // "place:indoor" -> "indoor" のように名前空間を外す
  function stripNs(tag: string) {
    const i = tag.indexOf(":");
    return i >= 0 ? tag.slice(i + 1) : tag;
  }

  // API -> 画面用Idea に変換（durationMin -> duration、タグはstrip）
  function toUiIdea(i: IdeaFromApi): Idea {
    return {
      id: i.id,
      title: i.title,
      duration: i.durationMin,
      tags: (i.tags ?? []).map(stripNs),
    };
  }

  // フィルター state（今回のテストでは未使用でもOK）
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const list: Idea[] = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");
    setBookmarkedIds(new Set(list.map((x) => x.id)));
    setBookmarkCount(list.length);
  }, []);

  async function fetchIdeas(body: Record<string, unknown>, append = false): Promise<void> {
    setLoading(true); setError(null);
  
    // 追加読み込み：ランダム時の重複を避けるため excludeIds を送る
    const excludeIds = append ? Array.from(seenIds) : [];
  
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...body,
          limit: PAGE_SIZE,        // ← 定数化
          offset: append ? offset : 0,
          excludeIds: append ? Array.from(seenIds) : [],
        }),
      });
      if (!res.ok) throw new Error("APIエラー: " + res.status);
      const json: ApiResponse = await res.json();
      const next = json.ideas ?? [];
  
      if (append) {
        // 既存に追加（重複は一応弾く）
        setIdeas(prev => {
          const exists = new Set(prev.map(x => x.id));
          const add = next.filter(x => !exists.has(x.id));
          return [...prev, ...add];
        });
        setSeenIds(prev => {
          const s = new Set(prev);
          next.forEach(x => s.add(x.id));
          return s;
        });
        setOffset(prev => prev + next.length);
      } else {
        // 初回 or 条件変更時はリセット
        setIdeas(next);
        setSeenIds(new Set(next.map(x => x.id)));
        setOffset(next.length);
      }
  
      setHasMore(!!json.hasMore);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }
  
  async function onRandomClick() {
    const q = { random: true };
    setLastQuery(q);
    await fetchIdeas(q, false); // append=false（初回）
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = {
      outcome: (data.get("outcome") as string) || "",
      mood: (data.get("mood") as string) || "",
      party: (data.get("party") as string) || "",
      random: false, // 並び順固定で出したい場合
    };
    setLastQuery(q);
    await fetchIdeas(q, false); // append=false（初回）
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }


  function toggleBookmark(item: Idea) {
    const list: Idea[] = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) list.push(item); else list.splice(idx, 1);
    localStorage.setItem("bookmarks", JSON.stringify(list));
    setBookmarkedIds(new Set(list.map((x) => x.id)));
    setBookmarkCount(list.length);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-teal-50 text-gray-900">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">今日なにする？</h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-700">
          気分や目的を選ぶか、ランダムにおまかせ。今日のあなたにぴったりなプランを見つけよう。
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={onRandomClick}
            className="inline-flex w-52 sm:w-56 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <Shuffle className="h-5 w-5" /> ランダム
          </button>
          <Link
            href="/plan"
            className="inline-flex w-52 sm:w-56 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-white px-6 py-3 font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <Clock className="h-5 w-5" /> タイムライン
            {bookmarkCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs text-white">
                {bookmarkCount}
              </span>
            )}
          </Link>
        </div>
      </section>

      {/* 条件フォーム */}
      <section id="plan" className="mx-auto mb-10 max-w-xl rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
        <form ref={formRef} onSubmit={onSubmit} className="grid gap-5">
          {/* selects …（省略せず使ってOK） */}
          <label className="grid gap-1">
            <span className="text-sm font-medium">どんな一日にしたい？</span>
            <select name="outcome" defaultValue="" className="h-11 rounded-xl border px-3 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200">
              <option value="">指定なし</option>
              <option value="smile">笑いたい</option>
              <option value="fun">楽しみたい</option>
              <option value="refresh">リフレッシュしたい</option>
              <option value="stress">ストレス発散したい</option>
              <option value="learning">学びたい</option>
              <option value="achievement">達成感ほしい</option>
              <option value="relax">リラックスしたい・癒されたい</option>
              <option value="budget">低予算で過ごしたい</option>
              <option value="nature">自然と触れたい</option>
              <option value="hobby">趣味を見つけたい</option>
              <option value="experience">体験したい</option>
              <option value="health">体にいいことをしたい</option>
              <option value="luxury">贅沢したい</option>
              <option value="art">アート・文学に触れたい</option>
              <option value="clean">綺麗にしたい</option>
              <option value="talk">話のネタをつくりたい</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">気分</span>
            <select name="mood" defaultValue="" className="h-11 rounded-xl border px-3 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200">
              <option value="">指定なし</option>
              <option value="outdoor">屋外</option>
              <option value="indoor">屋内</option>
              <option value="relax">のんびり</option>
              <option value="active">アクティブ</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">誰と？</span>
            <select name="party" defaultValue="" className="h-11 rounded-xl border px-3 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200">
              <option value="">指定なし</option>
              <option value="solo">ひとり</option>
              <option value="family">家族</option>
              <option value="partner">パートナー</option>
              <option value="friends">友人</option>
            </select>
          </label>

          <button type="submit" className="mt-1 w-full sm:w-auto min-w-40 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60">
            {loading ? "考え中…" : "考える"}
          </button>

          <Link href="/plan" className="inline-flex w-full sm:w-auto min-w-40 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3 font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200">
            <Clock className="h-5 w-5" /> タイムライン
            {bookmarkCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs text-white">
                {bookmarkCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => formRef.current?.reset()}
            className="mt-2 w-full sm:w-auto min-w-40 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-200"
          >
            クリア
          </button>
          {error && <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-3">{error}</p>}
        </form>
      </section>

      {/* 結果カード（タグ=日本語表示） */}
<section id="results" className="mx-auto max-w-4xl px-6 pb-16">
  {ideas.length > 0 && (
    <>
      <ul className="grid gap-4 md:grid-cols-2">
        {ideas.map((i) => {
          const active = bookmarkedIds.has(i.id);
          const jaTags = (i.tags ?? []).map((t) => TAG_LABELS[t] ?? t);
          return (
            <li key={i.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow">
              <h3 className="text-lg font-semibold">{i.title}</h3>
              <p className="mt-1 text-sm text-gray-600">所要目安：{i.duration ?? 60}分</p>

              {jaTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {jaTags.map((t) => (
                    <span key={t} className="text-xs rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-gray-700">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => toggleBookmark(i)}
                  className={"rounded-full border p-2 hover:bg-gray-50 " + (active ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "")}
                  aria-pressed={active}
                  title={active ? "ブックマーク済み" : "ブックマーク"}
                >
                  <Bookmark className="h-5 w-5" />
                </button>
                <Link href="/plan" className="rounded-full border p-2 hover:bg-gray-50" title="タイムラインで見る">
                  <Clock className="h-5 w-5" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {/* もっと見る */}
      <div className="mt-6 text-center">
        <button
          onClick={() => fetchIdeas(lastQuery, true)}   // append=true（追加読み込み）
          disabled={!hasMore || loading}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-white shadow hover:bg-emerald-700 disabled:opacity-50"
        >
          {hasMore ? "もっと見る" : "これ以上ありません"}
        </button>
      </div>
    </>
  )}

  {!loading && ideas.length === 0 && (
    <p className="text-sm text-gray-600">「ランダム」か「考える」で候補を表示します。</p>
  )}
</section>
    </main>
  );
}
