import activitiesJson from "@/data/activities.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Idea = {
  id: string;
  title: string;
  tags: string[];
  duration?: number; // JSONで未記入でも許容
};

function sampleRandom<T>(arr: readonly T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// JSONを型付けして常にdurationを埋める
const ACTIVITIES: Idea[] = (activitiesJson as Idea[]).map((x: Idea) => ({
  ...x,
  duration: x.duration ?? 60,
}));

// 既存フロントの呼び方が POST の想定
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const random: boolean = !!body.random;
  const mood: string | undefined = body.mood;        // 例: "outdoor" など
  const tags: string[] | undefined = body.tags;      // 例: ["kids","refresh"]
  const limit: number = Math.max(1, Math.min(Number(body.limit) || 6, 50));

  // 絞り込み（必要に応じて使われるフィルタ）
  let pool = ACTIVITIES;
  if (mood) pool = pool.filter((it: Idea) => it.tags?.includes(mood));
  if (tags?.length) {
    pool = pool.filter((it: Idea) => tags.some((t) => it.tags?.includes(t)));
  }

  const ideas = random
    ? sampleRandom(pool, Math.min(limit, pool.length))
    : pool.slice(0, limit);

  return Response.json({ ideas });
}

// GETで叩かれたときの簡易レスポンス（任意）
export async function GET() {
  return Response.json({ ideas: sampleRandom(ACTIVITIES, Math.min(6, ACTIVITIES.length)) });
}
