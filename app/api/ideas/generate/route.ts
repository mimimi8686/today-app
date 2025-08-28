import activitiesJson from "@/data/activities.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// --- 型（最低限） ---
type IdeaRaw = {
  id: string;
  title: string;
  tags?: string[];   // ["indoor","family","party:family"] など混在を想定
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
  party?: string;           // 日本語や英語混在を許容
  tags?: string[];
  offset?: number;
  excludeIds?: string[];
  conditions?: string[];    // 日本語/英語どちらも来る想定
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
  屋内: ["place:indoor"],
  outdoor: ["place:outdoor"],
  屋外: ["place:outdoor"],

  // party（旧表記 → namespaced）
  solo: ["party:solo"],
  ひとり: ["party:solo"],
  一人: ["party:solo"],
  おひとり: ["party:solo"],
  お一人: ["party:solo"],
  family: ["party:family"],
  親子: ["party:family"],
  家族: ["party:family"],
  partner: ["party:partner"],
  couple: ["party:partner"],
  カップル: ["party:partner"],
  夫婦: ["party:partner"],
  friends: ["party:friends"],
  友だち: ["party:friends"],
  友達: ["party:friends"],
  ともだち: ["party:friends"],

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
  短め: ["dur:15m", "dur:30m", "dur:45m", "dur:60m"],
  long:  ["dur:90m", "dur:120m", "dur:halfday", "dur:fullday"],
  長め:  ["dur:90m", "dur:120m", "dur:halfday", "dur:fullday"],

  // budget
  budget: ["outcome:budget"],
  低予算: ["outcome:budget"],
};

const OUTCOME_TO_ANY: Record<string, NamespacedTag[]> = {
  smile:      ["outcome:fun"],
  fun:        ["outcome:fun"],
  refresh:    ["outcome:refresh"],
  stress:     ["outcome:refresh","place:outdoor"],
  learning:   ["outcome:learning","cat:study"],
  achievement:["outcome:achievement"],
  relax:      ["outcome:relax","place:indoor"],
  budget:     ["outcome:budget","cat:food","cat:shopping"],  // 低予算の“寄せ”
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

// --- 正規化ヘルパ ---
type PartyTag = "party:solo" | "party:family" | "party:partner" | "party:friends";

function normalizePartyValue(v?: string): PartyTag | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  if (s.startsWith("party:")) {
    const k = s as PartyTag;
    if (["party:solo","party:family","party:partner","party:friends"].includes(k)) return k;
  }
  if (["solo","ひとり","一人","おひとり","お一人"].includes(s)) return "party:solo";
  if (["family","親子","家族"].includes(s)) return "party:family";
  if (["partner","couple","カップル","夫婦","パートナー"].includes(s)) return "party:partner";
  if (["friends","友だち","友達","ともだち","仲間"].includes(s)) return "party:friends";
  return undefined;
}

type CondFlags = {
  wantIndoor: boolean;
  wantOutdoor: boolean;
  wantShort: boolean;  // 〜60分
  wantLong: boolean;   // 90分〜
  wantBudget: boolean;
};

function normalizeConditions(arr?: string[]): CondFlags {
  const f: CondFlags = { wantIndoor:false, wantOutdoor:false, wantShort:false, wantLong:false, wantBudget:false };
  if (!Array.isArray(arr)) return f;
  for (const raw of arr) {
    const s = String(raw).toLowerCase();
    if (["indoor","屋内"].includes(s))  f.wantIndoor = true;
    else if (["outdoor","屋外"].includes(s)) f.wantOutdoor = true;
    else if (["short","短め"].includes(s))  f.wantShort = true;
    else if (["long","長め"].includes(s))   f.wantLong = true;
    else if (["budget","低予算"].includes(s)) f.wantBudget = true;
  }
  return f;
}

// JSON 1件を正規化
function normalize(raw: IdeaRaw): Idea {
  const d = Number(raw.duration ?? 60);
  const set = new Set<NamespacedTag>([durationBucket(d)]);

  for (const t0 of raw.tags ?? []) {
    const t = String(t0).trim();
    // すでに namespaced ならそのまま受け入れる
    if (t.includes(":")) {
      set.add(t as NamespacedTag);
      continue;
    }
    // 旧タグならマップ
    const mapped = TAG_MAP[t.toLowerCase()] ?? TAG_MAP[t];
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

// 必須タグ（mood と conditions の place を統合）
function bodyToRequiredPlaceTags(mood: RequestBody["mood"], flags: CondFlags): NamespacedTag[] {
  // mood が place を指定する場合はそれを優先
  if (mood === "outdoor") return ["place:outdoor"];
  if (mood === "indoor")  return ["place:indoor"];

  // mood で未指定なら conditions を参照
  if (flags.wantIndoor && !flags.wantOutdoor) return ["place:indoor"];
  if (!flags.wantIndoor && flags.wantOutdoor) return ["place:outdoor"];
  // 両方 or どちらも → 制限なし（OR 扱い）
  return [];
}

// ソフト条件
function buildSoftTags(body: RequestBody, flags: CondFlags): Set<NamespacedTag> {
  const s = new Set<NamespacedTag>();
  if (body.outcome) {
    const m = OUTCOME_TO_ANY[body.outcome];
    if (m) m.forEach(t => s.add(t));
  }
  if (body.mood === "relax")  MOOD_TO_ANY.relax.forEach(t => s.add(t));
  if (body.mood === "active") MOOD_TO_ANY.active.forEach(t => s.add(t));

  const party = normalizePartyValue(body.party);
  if (party === "party:family") PARTY_TO_SOFT.family.forEach(t => s.add(t));

  // 低予算は現状ソフト寄せ（将来 cost 情報が入ったらハードに変更可）
  if (flags.wantBudget) OUTCOME_TO_ANY.budget.forEach(t => s.add(t));

  // 屋内/屋外・短め/長めはハード側で扱うのでここでは加点に使わない
  return s;
}

// スコア計算
function scoreBySoftTags(idea: Idea, soft: Set<NamespacedTag>): number {
  let s = 0;
  for (const t of idea.tags) if (soft.has(t)) s++;
  return s;
}

// --- タイトルから複数人前提を推定（“ひとり”保護用） ---
function looksMultiPerson(title: string): boolean {
  const kw = [
    "親子", "家族", "ファミリー", "兄弟", "姉妹",
    "友だち", "友達", "ともだち", "みんなで", "対戦", "試合", "チーム",
    "キャッチボール", "ダブルス", "バトル", "ペア", "二人", "二人で", "一緒に",
    "子ども", "子供", "こども"
  ];
  return kw.some(w => title.includes(w));
}

// --- party のハード条件 ---
function partyMatches(idea: { tags?: NamespacedTag[]; title?: string }, selected?: string): boolean {
  const want = normalizePartyValue(selected);
  if (!want) return true; // party 未指定・不明表記は通す

  const have = (idea.tags ?? []).filter((t) => t.startsWith("party:"));
  if (have.length > 0) return have.includes(want);

  // party タグが無い場合：solo 選択でタイトルが複数人前提なら除外
  if (want === "party:solo") return !looksMultiPerson(idea.title ?? "");
  return true;
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

  // 条件を正規化
  const flags = normalizeConditions(body.conditions);

  // place の必須条件（mood と conditions を統合）
  const requiredPlace = bodyToRequiredPlaceTags(body.mood, flags);

  // base pool: place の必須条件で絞り込み
  let pool = ACTIVITIES.filter((it) => includesAllTags(it.tags, requiredPlace));

  // ★ duration のハード条件（短め/長め）
  if (flags.wantShort && !flags.wantLong) {
    pool = pool.filter(it => it.durationMin <= 60);
  } else if (flags.wantLong && !flags.wantShort) {
    pool = pool.filter(it => it.durationMin >= 90);
  } // 両方 or どちらも → 制限なし

  // party のハード条件
  if (body.party) {
    pool = pool.filter((it) => partyMatches(it, body.party!));
  }

  // 除外ID
  if (excludeIds.length) {
    const ex = new Set(excludeIds);
    pool = pool.filter(it => !ex.has(it.id));
  }

  // ORタグ（任意）— namespaced 渡しにも対応
  const orTags: string[] = Array.isArray(body?.tags) ? body.tags : [];
  if (orTags.length) {
    const orNs = new Set<NamespacedTag>();
    for (const t of orTags) {
      const mapped = TAG_MAP[t.toLowerCase()] ?? TAG_MAP[t];
      if (mapped) mapped.forEach(v => orNs.add(v));
      if (t.includes(":")) orNs.add(t as NamespacedTag);
    }
    if (orNs.size) {
      pool = pool.filter((it) => it.tags.some(tag => orNs.has(tag)));
    }
  }

  // ソフト条件によるスコアリング（低予算など）
  const soft = buildSoftTags(body, flags);
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
