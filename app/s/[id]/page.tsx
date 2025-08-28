// app/s/[id]/page.tsx
import "server-only";
import { loadShortLink, type SharePayload, type IdeaItem } from "@/lib/shortlink";
import Link from "next/link";
// NavMenu を入れたい場合はここでも import 可能（任意）
// import NavMenu from "@/app/components/NavMenu";

export const dynamic = "force-dynamic";

// OGP/Twitterカード
export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = loadShortLink(params.id);
  const title = data?.title ?? "共有プラン";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const pageUrl = `${base}/s/${params.id}`;
  const og = `${base}/api/og?title=${encodeURIComponent(title)}`;
  return {
    title,
    description: "今日のプラン共有",
    openGraph: {
      title,
      description: "今日のプラン共有",
      url: pageUrl,
      images: [{ url: og, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description: "今日のプラン共有", images: [og] },
  };
}

export default async function SharedPage({ params }: { params: { id: string } }) {
  const data = loadShortLink(params.id) as SharePayload | null;
  if (!data) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">リンクが見つかりませんでした</h1>
        <p className="mt-2 text-gray-600">有効期限切れか、削除された可能性があります。</p>
        <div className="mt-4">
          <Link href="/" className="underline text-emerald-700">TOPへ戻る</Link>
        </div>
      </main>
    );
  }

  const title = data.title ?? "共有プラン";
  const request = data.request;
  const ideas: IdeaItem[] = data.ideas ?? [];

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Link href="/" className="underline text-emerald-700">アプリへ</Link>
      </header>

      {request && (
        <section className="rounded border bg-gray-50 p-4">
          <h2 className="mb-2 font-medium">条件</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(request, null, 2)}
          </pre>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-medium">候補</h2>
        {ideas.length === 0 ? (
          <p className="text-gray-500 text-sm">候補がありません。</p>
        ) : (
          <ul className="grid gap-3">
            {ideas.map((i) => (
              <li key={i.id} className="rounded border p-3 bg-white">
                <div className="font-medium">{i.title}</div>
                {typeof i.duration === "number" ? (
                  <div className="text-xs text-gray-500 mt-1">所要 {i.duration} 分</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
