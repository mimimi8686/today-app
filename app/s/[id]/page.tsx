// app/s/[id]/page.tsx
import "server-only";
import Link from "next/link";
import { loadShortLink, type SharePayload, type IdeaItem } from "@/lib/shortlink";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: { id: string } }) {
  const { id } = props.params;

  // ← 必ず await。型を直接 SharePayload にするキャストはしない
  const data = await loadShortLink(id);

  // スタブ段階のガード
  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">リンクが見つかりませんでした</h1>
        <p className="mt-2 text-sm text-gray-600">ID: {id}</p>
        <p className="mt-4">
          <Link href="/" className="underline">トップへ戻る</Link>
        </p>
      </div>
    );
  }

  const title = data.title ?? "共有プラン";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const pageUrl = `${base}/s/${id}`;
  const og = `${base}/api/og?title=${encodeURIComponent(title)}`;

  /* ======== ここから下に、あなたの既存UIを戻してください ======== */
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      <section className="mt-4">
        <h2 className="font-semibold">共有URL</h2>
        <p className="text-sm break-all">{pageUrl}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">アイデア一覧</h2>
        <ul className="list-disc pl-5">
          {data.ideas.map((it: IdeaItem) => (
            <li key={it.id}>
              {it.title}
              {typeof it.duration === "number" ? `（${it.duration}分）` : ""}
            </li>
          ))}
        </ul>
      </section>

      {/* 必要に応じて OG 画像URLの利用など */}
      <p className="mt-6 text-xs text-gray-500">OG: {og}</p>
    </main>
  );
  /* ======== 既存UIここまで ======== */
}
