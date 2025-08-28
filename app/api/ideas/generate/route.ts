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
  | `cat:${"nature"|"food"|"exercise"|"study"|"art"|"cleaning"|"shopping"|"entertainment"|"travel"|"wellness"|"home"|"errand"|"hobby"}`
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
  offset?: number;          // 非ランダム時のページング用（何件目から返すか）
  excludeIds?: string[];    // 既に表示済みのID（ランダム時の重複除外用）
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

  // よく出る生タグがあればここに追加（例）
  nature: ["cat:nature","outcome:nature"],
  art: ["outcome:art","cat:art"],
  hobby: ["outcome:hobby","cat:hobby" as NamespacedTag],
  experience: ["outcome:experience"],
  health: ["outcome:health"],
  luxury: ["outcome:luxury"],
  clean: ["outcome:clean","cat:cleaning"],
  walk: ["cat:exercise"],          // 散歩系は軽い運動扱い
  relax: ["outcome:relax"],        // 生タグに relax があれば拾う
  short: ["dur:15m", "dur:30m", "dur:45m", "dur:60m"],
  long:  ["dur:90m", "dur:120m", "dur:halfday", "dur:fullday"],
  
};

const OUTCOME_TO_ANY: Record<string, NamespacedTag[]> = {
  smile:      ["outcome:fun"],
  fun:        ["outcome:fun"],
  refresh:    ["outcome:refresh"],
  stress:     ["outcome:refresh", "place:outdoor"],
  learning:   ["outcome:learning", "cat:study"],
  achievement:["outcome:achievement"],
  relax:      ["outcome:relax", "place:indoor"],
  budget:     ["cat:shopping","cat:food","place:outdoor"],
  nature:     ["cat:nature","place:outdoor"],
  hobby:      ["cat:hobby","outcome:learning"],
  experience: ["outcome:experience"],
  health:     ["outcome:health","cat:exercise"],
  luxury:     ["outcome:luxury"],
  art:        ["outcome:art","cat:art"],
  clean:      ["outcome:clean","cat:cleaning","cat:home"],
  talk:       ["outcome:talk","cat:entertainment"],
};

const MOOD_TO_ANY: Record<string, NamespacedTag[]> = {
  relax: ["outcome:relax","outcome:refresh","place:indoor"],
  active:["outcome:achievement","cat:exercise","place:outdoor"],
};

const PARTY_TO_SOFT: Record<string, NamespacedTag[]> = {
  family: ["kids:ok"],
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

// リクエストボディ → 「確実に存在するAND条件」だけ作る（= place のみ）
function bodyToRequiredTags(body: RequestBody): NamespacedTag[] {
  const req: NamespacedTag[] = [];

  // mood (indoor/outdoor) は AND 条件
  if (body.mood === "outdoor") req.push("place:outdoor");
  if (body.mood === "indoor")  req.push("place:indoor");

  // party は AND 条件にする
  if (body.party) req.push(`party:${body.party}` as NamespacedTag);

  // outcome も AND 条件にする（本当に厳密にするなら）
  if (body.outcome) req.push(`outcome:${body.outcome}` as NamespacedTag);

  return req;
}

// outcome / mood(relax/active) / party を「スコア対象」に広げる
function buildSoftTags(body: RequestBody): NamespacedTag[] {
  const soft: NamespacedTag[] = [];

  // outcome 本人 & 類縁タグ
  if (body.outcome) {
    soft.push(`outcome:${body.outcome}` as NamespacedTag);
    OUTCOME_TO_ANY[body.outcome]?.forEach(t => soft.push(t));
  }

  // mood の relax/active は補助タグとして扱う
  if (body.mood === "relax" || body.mood === "active") {
    MOOD_TO_ANY[body.mood]?.forEach(t => soft.push(t));
  }

  // party は本人タグ + 子どもOK等の緩いシグナル
  if (body.party) {
    soft.push(`party:${body.party}` as NamespacedTag);
    PARTY_TO_SOFT[body.party]?.forEach(t => soft.push(t));
  }

  return soft;
}

// softTags をどれだけ含むかで点数化（outcome一致は重め）
function scoreBySoftTags(it: Idea, soft: Set<NamespacedTag>): number {
  let s = 0;
  for (const tag of it.tags) {
    if (soft.has(tag)) s += String(tag).startsWith("outcome:") ? 2 : 1;
  }
  return s;
}


// 既存フロントが POST で叩く想定
export async function POST(req: Request) {
  const body: RequestBody = await req.json().catch(() => ({} as RequestBody));

  const random: boolean = !!body.random;
  const limit: number = Math.max(1, Math.min(Number(body.limit) || 6, 50));

  // ★ ここを追加
  const offset: number = Math.max(0, Number(body.offset) || 0);
  const excludeIds: string[] = Array.isArray(body.excludeIds) ? body.excludeIds : [];

  // 追加分：フォーム値から AND 条件にするタグを作成
  const requiredTags = bodyToRequiredTags(body);

  // 既存互換：自由タグOR（例: ["kids","refresh"]）
  const orTags: string[] = Array.isArray(body?.tags) ? body.tags : [];

  // ベースプール（★ 宣言は1回だけ）
  let pool = ACTIVITIES.filter((it) => includesAllTags(it.tags, requiredTags));

  // orTags の適用（名前空間にマップして「どれか含む」）
  if (orTags.length) {
    const orNs = new Set<NamespacedTag>();
    for (const t of orTags) {
      const mapped = TAG_MAP[t.toLowerCase()];
      if (mapped) mapped.forEach(v => orNs.add(v));
    }
    if (orNs.size) {
      pool = pool.filter((it) => it.tags.some(tag => orNs.has(tag)));
    }
  }

  // excludeIds の適用（重複除外）
  if (excludeIds.length) {
    const ex = new Set(excludeIds);
    pool = pool.filter(it => !ex.has(it.id));
  }  

  // ランダム or 先頭からのスライス（ページング）
  let ideas: Idea[] = [];
  let hasMore = false;

  if (random) {
    // ランダムは「重複除外済みプール」から抽選 → まだ残っていれば hasMore
    const count = Math.min(limit, pool.length);
    ideas = sampleRandom(pool, count);
    hasMore = pool.length > count;
  } else {
    // 非ランダムは offset/limit でページング
    const end = Math.min(offset + limit, pool.length);
    ideas = pool.slice(offset, end);
    hasMore = end < pool.length;
  }

  return Response.json({
    ideas,
    hasMore,          // ← 次があるかどうか
    total: pool.length + ideas.length, // 除外前の全件イメージが必要なら調整可
  });
}