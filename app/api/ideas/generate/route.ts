export const runtime = "edge";
export const dynamic = "force-dynamic";

type Idea = { id: string; title: string; tags: string[]; duration: number };

// ざっくりプール（必要に応じて増やしてOK）
const POOL: Idea[] = [
  { id: "1", title: "ベランダ水遊び×氷アート", tags: ["indoor","kids","craft"], duration: 30 },
  { id: "2", title: "近所の公園でどんぐり探しビンゴ", tags: ["outdoor","nature","free"], duration: 60 },
  { id: "3", title: "おうち映画館：毛布＋ポップコーン", tags: ["indoor","relax"], duration: 90 },
  { id: "4", title: "図書館で“三色しおり”読書クエスト", tags: ["indoor","learning","budget"], duration: 45 },
  { id: "5", title: "パン屋ハシゴ散歩：お気に入りランキング", tags: ["outdoor","walk","refresh"], duration: 75 },
  { id: "6", title: "紙コップけん玉を作って遊ぶ", tags: ["indoor","craft","kids"], duration: 25 },
  { id: "7", title: "ベランダ菜園のプチ手入れ", tags: ["indoor","refresh"], duration: 20 },
  { id: "8", title: "夕方さんぽで空の色集め", tags: ["outdoor","walk"], duration: 40 },
];

// シャッフル関数
function sampleRandom<T>(arr: T[], n: number) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  const { random = false, mood = "", outcome = "", party = "" } = body ?? {};

  // ランダム or 指定なし（全部「」）なら、プールからランダムで返す
  if (random || (!mood && !outcome && !party)) {
    return new Response(
      JSON.stringify({ ideas: sampleRandom(POOL, 6) }),
      { headers: { "content-type": "application/json" }, status: 200 }
    );
  }

  // ざっくりフィルタ（必要に応じて拡張）
  let list = POOL;
  if (mood === "outdoor") list = list.filter((x) => x.tags.includes("outdoor"));
  if (mood === "indoor")  list = list.filter((x) => x.tags.includes("indoor"));
  // outcome / party は将来タグ設計次第で拡張

  // 候補が少なければランダム補完
  if (list.length < 6) {
    const fallback = sampleRandom(POOL, 6 - list.length);
    list = [...list, ...fallback];
  }

  return new Response(
    JSON.stringify({ ideas: sampleRandom(list, 6) }),
    { headers: { "content-type": "application/json" }, status: 200 }
  );
}
