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
  offset?: number;
  excludeIds?: string[];
  conditions?: string[];
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

// 旧→名前空間タグの最小マップ
const TAG_MAP: Record<string, NamespacedTag[]> = {
  // place
  indoor: ["place:indoor"],
  outdoor: ["place:outdoor"],

  // party（←追加）
  solo: ["party:solo"],
  family: ["party:family"],
  partner: ["party:partner"],
  friends: ["party:friends"],

  // outcomes / categories
  learning: ["outcome:learning", "cat:study"],
  refresh: ["outcome:refresh"],
  food: ["cat:food"],
  kids: ["kids:ok"],
  nature: ["cat:nature","outcome:nature"],
  art: ["outcome:art","cat:art"],
  hobby: ["outcome:hobby","cat:hobby"],
  experience: ["outcome:experience"],
  health: ["outcome:health"],
  luxury: ["outcome:luxury"],
  clean: ["outcome:clean","cat:cleaning"],
  walk: ["cat:exercise"],
  relax: ["outcome:relax"],

  // duration buckets
  short: ["dur:15m", "dur:30m", "dur:45m", "dur:60m"],
  long:  ["dur:90m", "dur:120m", "dur:halfday", "dur:fullday"],
};

const OUTCOME_TO_ANY: Record<string, NamespacedTag[]> = {
  smile:      ["outcome:fun"],
  fun:        ["outcome:fun"],
  refresh:    ["outcome:refresh"],
  stress:     ["outcome:refresh","place:outdoor"],
  learning:   ["outcome:learning","cat:study"],
  achievement:["outcome:achievement"],
  relax:      ["outcome:relax","place:indoor"],
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
  }
  return { id: raw.id, title: raw.title, durationMin: d, tags: Array.from(set) };
}

// モジュールロード時に一度だけ正規化
const ACTIVITIES: Idea[] = (activitiesJson as IdeaRaw[]).map(normalize);

// AND一致
function includesAllTags(have: NamespacedTag[], required: NamespacedTag[]) {
  if (!required.length) return true;
  const set = new Set(have.map(s => s.toLowerCase()));
  return required.every(tag => set.has(tag.toLowerCase()));
}

// 必須タグ（place のみ）
function bodyToRequiredTags(body: RequestBody): NamespacedTag[] {
  const req: NamespacedTag[] = [];
  if (body.mood === "outdoor") req.push("place:outdoor");
  if (body.mood === "indoor")  req.push("place:indoor");
  return req;
}

// ソフト条件
function buildSoftTags(body: RequestBody): Set<NamespacedTag> {
  const s = new Set<NamespacedTag>();
  if (body.outcome) {
    const m = OUTCOME_TO_ANY[body.outcome];
    if (m) m.forEach(t => s.add(t));
  }
  if (body.mood === "relax")  MOOD_TO_ANY.relax.forEach(t => s.add(t));
  if (body.mood === "active") MOOD_TO_ANY.active.forEach(t => s.add(t));
  if (body.party) {
    const p = PARTY_TO_SOFT[body.party];
    if (p) p.forEach(t => s.add(t));
  }
  const conds = body.conditions;
  if (Array.isArray(conds)) {
    for (const c of conds) {
      if (c === "budget") {
        ["outcome:budget","cat:food","cat:shopping"].forEach(t => s.add(t as NamespacedTag));
      } else if (c === "indoor") {
        s.add("place:indoor");
      } else if (c === "outdoor") {
        s.add("place:outdoor");
      } else if (c === "short") {
        ["dur:15m","dur:30m","dur:45m","dur:60m"].forEach(t => s.add(t as NamespacedTag));
      } else if (c === "long") {
        ["dur:90m","dur:120m","dur:halfday","dur:fullday"].forEach(t => s.add(t as NamespacedTag));
      }
    }
  }
  return s;
}

// スコア計算
function scoreBySoftTags(idea: Idea, soft: Set<NamespacedTag>): number {
  let s = 0;
  for (const t of idea.tags) if (soft.has(t)) s++;
  return s;
}

// --- party のハード条件フィルタ（★追加） ---
type PartyTag = "party:solo" | "party:family" | "party:partner" | "party:friends";

/**
 * 選択された party（ひとり/親子/…）に合わない候補は除外する。
 * - リクエストで party 未指定 → 通す
 * - 候補側に party タグがある → 交差しなければ除外
 * - 候補側に party タグがない → 「ひとり」選択時のみ除外（安全側）
 */
function partyMatches(
  idea: { tags?: NamespacedTag[] },
  selected?: (PartyTag | string)
): boolean {
  if (!selected) return true;

  const want = String(selected).startsWith("party:")
    ? (selected as PartyTag)
    : (`party:${selected}` as PartyTag);

  const have = (idea.tags ?? []).filter((t) => t.startsWith("party:"));

  if (have.length > 0) {
    return have.includes(want);
  }

  // アイデア側に party タグが無い：ひとり選択なら除外、それ以外は許可
  return want !== "party:solo";
}

// ---------------------------
// API 本体
// ---------------------------
export async function POST(req: Request) {
  const body: RequestBody = await req.json().catch(() => ({} as RequestBody));

  const random = !!body.random;
  const limit  = Math.max(1, Math.min(Number(body.limit) || 6, 50));
  const offset = Math.max(0, Number(body.offset) || 0);
  const excludeIds: string[] = Array.isArray(body.excludeIds) ? body.excludeIds : [];

  const requiredTags = bodyToRequiredTags(body);
  const orTags: string[] = Array.isArray(body?.tags) ? body.tags : [];

  // base pool: place の必須条件で絞り込み
  let pool = ACTIVITIES.filter((it) => includesAllTags(it.tags, requiredTags));

  // ORタグ（任意）
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

  // 除外ID
  if (excludeIds.length) {
    const ex = new Set(excludeIds);
    pool = pool.filter(it => !ex.has(it.id));
  }

  // ★ party のハード条件（ここで弾く）
  if (body.party) {
    pool = pool.filter((it) => partyMatches(it, body.party!));
  }

  // ソフト条件によるスコアリング
  const soft = buildSoftTags(body);
  if (soft.size) {
    pool = pool
      .map(it => ({ it, s: scoreBySoftTags(it, soft) }))
      .sort((a, b) => b.s - a.s)
      .map(x => x.it);
  }

  // ページング/ランダム
  let ideas: Idea[] = [];
  let hasMore = false;

  if (random) {
    const count = Math.min(limit, pool.length);
    ideas = sampleRandom(pool, count);
    hasMore = pool.length > count;
  } else {
    const end = Math.min(offset + limit, pool.length);
    ideas = pool.slice(offset, end);
    hasMore = end < pool.length;
  }

  return Response.json({ ideas, hasMore, total: pool.length });
}
