export const runtime = "edge";
export const dynamic = "force-dynamic";

type Idea = { id: string; title: string; tags: string[]; duration: number };

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

function sampleRandom<T>(arr: readonly T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

type RequestBody = { random?: boolean; mood?: string; outcome?: string; party?: string };

function parseBody(body: unknown): Required<RequestBody> {
  const d = { random: false, mood: "", outcome: "", party: "" };
  if (typeof body !== "object" || body === null) return d;
  const o = body as Record<string, unknown>;
  return {
    random: typeof o.random === "boolean" ? o.random : false,
    mood: typeof o.mood === "string" ? o.mood : "",
    outcome: typeof o.outcome === "string" ? o.outcome : "",
    party: typeof o.party === "string" ? o.party : "",
  };
}

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { json = undefined; }
  const { random, mood, outcome, party } = parseBody(json);

  if (random || (!mood && !outcome && !party)) {
    return new Response(JSON.stringify({ ideas: sampleRandom(POOL, 6) }), {
      headers: { "content-type": "application/json" }, status: 200,
    });
  }

  let list = POOL;
  if (mood === "outdoor") list = list.filter((x) => x.tags.includes("outdoor"));
  if (mood === "indoor")  list = list.filter((x) => x.tags.includes("indoor"));
  if (list.length < 6) list = [...list, ...sampleRandom(POOL, 6 - list.length)];

  return new Response(JSON.stringify({ ideas: sampleRandom(list, 6) }), {
    headers: { "content-type": "application/json" }, status: 200,
  });
}
