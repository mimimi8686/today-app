import activitiesJson from "@/data/activities.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// --- 型（最低限） ---
type IdeaRaw = {
  id: string;
  title: string;
  tags?: string[];   // ["indoor","learning","kids"] のような旧タグ
  duration?: number; // 分
};

type NamespacedTag =
  | `place:${"indoor"|"outdoor"}`
  | `outcome:${"smile"|"fun"|"refresh"|"stress"|"learning"|"achievement"|"relax"|"budget"|"nature"|"hobby"|"experience"|"health"|"luxury"|"art"|"clean"|"talk"}`
  | `mood:${"relax"|"active"}`
  | `party:${"solo"|"family"|"partner"|"friends"}`
  | `cat:${"nature"|"food"|"exercise"|"study"|"art"|"cleaning"|"shopping"|"entertainment"|"travel"|"wellness"|"home"|"errand"}`
  | `dur:${"15m"|"30m"|"45m"|"60m"|"90m"|"120m"|"halfday"|"fullday"}`
  | `kids:${"ok"|"ng"}`;

// 内部で使う構造（正規化済み）
type Idea = {
  id: string;
  title: string;
  tags: NamespacedTag[];
  durationMin: number;
};

// フロントから来るボディの型
type RequestBody = {
  random?: boolean;
  limit?: number;
  mood?: "outdoor" | "indoor" | "relax" | "active";
  outcome?: string;
  party?: "solo" | "family" | "partner" | "friends";
  tags?: string[];
};

// --- ユーティリティ ---
function sampleRandom<T>(arr: readonly T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function durationBucket(mins: number): NamespacedTag {
  if (mins <= 15) return "dur:15m";
  if (mins <= 30) return "dur:30m";
  if (mins <= 45) return "dur:45m";
  if (mins <= 60) return "dur:60m";
  if (mins <= 90) return "dur:90m";
  if (mins <= 120) return "dur:120m";
  return "dur:halfday";
}

// 旧→名前空間タグの最小マップ（足したくなったらここに追記）
const TAG_MAP: Record<string, NamespacedTag[]> = {
  indoor: ["place:indoor"],
  outdoor: ["place:outdoor"],
  learning: ["outcome:learning", "cat:study"],
  refresh: ["outcome:refresh"],
  food: ["cat:food"],
  kids: ["kids:ok"],
};

// JSON 1件を正規化
function normalize(raw: IdeaRaw): Idea {
  const d = Number(raw.duration ?? 60);
  const set = new Set<NamespacedTag>([durationBucket(d)]);

  for (const t of raw.tags ?? []) {
    const mapped = TAG_MAP[t.toLowerCase()];
    if (mapped) mapped.forEach(v => set.add(v));
    // マップに無いタグは、まずは無視（必要なら扱いを拡張）
  }

  return {
    id: raw.id,
    title: raw.title,
    durationMin: d,
    tags: Array.from(set),
  };
}

// モジュールロード時に一度だけ正規化
const ACTIVITIES: Idea[] = (activitiesJson as IdeaRaw[]).map(normalize);

// AND一致
function includesAllTags(have: NamespacedTag[], required: NamespacedTag[]) {
  if (!required.length) return true;
  const set = new Set(have.map(s => s.toLowerCase()));
  return required.every(tag => set.has(tag.toLowerCase()));
}

// リクエストボディ → 必須タグ（AND）の変換
function bodyToRequiredTags(body: RequestBody): NamespacedTag[] {
  const req: NamespacedTag[] = [];

  const mood = body.mood;
  if (mood === "outdoor") req.push("place:outdoor");
  else if (mood === "indoor") req.push("place:indoor");
  else if (mood === "relax") req.push("mood:relax");
  else if (mood === "active") req.push("mood:active");

  if (body.outcome) req.push(`outcome:${body.outcome}` as NamespacedTag);
  if (body.party)   req.push(`party:${body.party}` as NamespacedTag);

  return req;
}


// 既存フロントが POST で叩く想定
export async function POST(req: Request) {
  const body: RequestBody = await req.json().catch(() => ({} as RequestBody));

  const random: boolean = !!body.random;
  const limit: number = Math.max(1, Math.min(Number(body.limit) || 6, 50));

  // 追加分：フォーム値から AND 条件にするタグを作成
  const requiredTags = bodyToRequiredTags(body);

  // 既存互換：自由タグOR（例: ["kids","refresh"]）
  const orTags: string[] = Array.isArray(body?.tags) ? body.tags : [];

  // ベースプール
  let pool = ACTIVITIES.filter((it) => includesAllTags(it.tags, requiredTags));

  // 既存のORタグは、正規化マップ経由で “どれかを含む” にします
  if (orTags.length) {
    const orNs = new Set<NamespacedTag>();
    for (const t of orTags) {
      const mapped = TAG_MAP[t.toLowerCase()];
      if (mapped) mapped.forEach(v => orNs.add(v));
      // マップにないタグは無視（必要ならここも拡張）
    }
    if (orNs.size) {
      pool = pool.filter((it) => it.tags.some(tag => orNs.has(tag)));
    }
  }

  // ランダム or 先頭
  const items = random
    ? sampleRandom(pool, Math.min(limit, pool.length))
    : pool.slice(0, limit);

  return Response.json({ ideas: items });
}

// GET（動作確認用）
export async function GET() {
  const items = sampleRandom(ACTIVITIES, Math.min(6, ACTIVITIES.length));
  return Response.json({ ideas: items });
}
