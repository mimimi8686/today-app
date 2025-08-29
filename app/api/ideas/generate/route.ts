import activitiesJson from "@/data/activities.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// --- 型（最低限） ---
type IdeaRaw = {
  id: string;
  title: string;
  tags?: string[];     // 旧: ["indoor","family","party:family"] など
  duration?: number;   // 分

  // ↓ レガシー個別フィールド（混在想定：string | string[]）
  place?: string | string[];
  outcomes?: string | string[];
  mood?: string | string[];
  party?: string | string[];
  kids?: string | string[];
  cat?: string | string[];
  extra_tags?: string | string[];
};

type NamespacedTag =
  | `place:${"indoor"|"outdoor"}`
  | `outcome:${"smile"|"fun"|"refresh"|"stress"|"learning"|"achievement"|"relax"|"budget"|"nature"|"hobby"|"experience"|"health"|"luxury"|"art"|"clean"|"talk"}`
  | `mood:${"relax"|"active"}`
  | `party:${"solo"|"family"|"partner"|"friends"}`
  | `cat:${"nature"|"food"|"exercise"|"study"|"art"|"cleaning"|"shopping"|"entertainment"|"travel"|"wellness"|"home"|"errand"|"hobby"}`
  | `dur:${"15m"|"30m"|"45m"|"60m"|"90m"|"120m"|"halfday"|"fullday"}`
  | `kids:${"ok"|"ng"}`;

type Idea = {
  id: string;
  title: string;
  tags: NamespacedTag[];
  durationMin: number;
};

type RequestBody = {
  random?: boolean;
  limit?: number;
  mood?: "outdoor" | "indoor" | "relax" | "active";
  outcome?: string;
  party?: string;           // 日本語/英語混在OK
  tags?: string[];
  offset?: number;
  excludeIds?: string[];
  conditions?: string[];    // 日本語/英語混在OK
};

// --------------- ユーティリティ共通 ---------------

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
  indoor: ["place:indoor"], 屋内: ["place:indoor"],
  outdoor: ["place:outdoor"], 屋外: ["place:outdoor"],

  // party
  solo: ["party:solo"], ひとり: ["party:solo"], 一人: ["party:solo"], おひとり: ["party:solo"], お一人: ["party:solo"],
  family: ["party:family"], 親子: ["party:family"], 家族: ["party:family"],
  partner: ["party:partner"], couple: ["party:partner"], カップル: ["party:partner"], 夫婦: ["party:partner"],
  friends: ["party:friends"], 友だち: ["party:friends"], 友達: ["party:friends"], ともだち: ["party:friends"],

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
  short: ["dur:15m","dur:30m","dur:45m","dur:60m"], 短め: ["dur:15m","dur:30m","dur:45m","dur:60m"],
  long: ["dur:90m","dur:120m","dur:halfday","dur:fullday"], 長め: ["dur:90m","dur:120m","dur:halfday","dur:fullday"],

  // budget
  budget: ["outcome:budget"], 低予算: ["outcome:budget"], free: ["outcome:budget"], 無料: ["outcome:budget"], フリー: ["outcome:budget"],
};

const OUTCOME_TO_ANY: Record<string, NamespacedTag[]> = {
  smile: ["outcome:fun"], fun: ["outcome:fun"],
  refresh: ["outcome:refresh"], stress: ["outcome:refresh","place:outdoor"],
  learning: ["outcome:learning","cat:study"], achievement: ["outcome:achievement"],
  relax: ["outcome:relax","place:indoor"],
  budget: ["outcome:budget","cat:food","cat:shopping"],
  nature: ["cat:nature","place:outdoor"], hobby: ["cat:hobby","outcome:learning"],
  experience: ["outcome:experience"], health: ["outcome:health","cat:exercise"],
  luxury: ["outcome:luxury"], art: ["outcome:art","cat:art"],
  clean: ["outcome:clean","cat:cleaning","cat:home"], talk: ["outcome:talk","cat:entertainment"],
};

const MOOD_TO_ANY: Record<string, NamespacedTag[]> = {
  relax: ["outcome:relax","outcome:refresh","place:indoor"],
  active:["outcome:achievement","cat:exercise","place:outdoor"],
};

const PARTY_TO_SOFT: Record<string, NamespacedTag[]> = {
  family: ["kids:ok"],
};

// ---- 入力正規化 ----
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

  // 全角→半角・小文字化・余分記号の整理
  const normalize = (x: string) => {
    const toHalf = (s: string) =>
      s.replace(/[0-9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
    return toHalf(String(x))
      .toLowerCase()
      .replace(/[（）()[]\[\]\s]/g, "")   // 括弧・空白
      .replace(/[〜～~\-–—]/g, "");       // チルダ/波線/ダッシュ類
  };

  for (const raw of arr) {
    const s = normalize(raw);

    // 屋内 / 屋外
    if (s.includes("indoor") || s.includes("屋内")) f.wantIndoor = true;
    if (s.includes("outdoor") || s.includes("屋外")) f.wantOutdoor = true;

    // 低予算
    if (s.includes("budget") || s.includes("低予算") || s.includes("free") || s.includes("無料") || s.includes("ﾌﾘｰ"))
      f.wantBudget = true;

    // ---- 時間帯（短め/長め）----
    if (s.includes("短") || s.includes("short")) f.wantShort = true;
    if (s.includes("長") || s.includes("long"))  f.wantLong  = true;

    // 数値ヒント
    if (/\b60\b/.test(s) || /60分/.test(s)) f.wantShort = true;
    if (/\b90\b/.test(s) || /90分/.test(s)) f.wantLong  = true;
  }

  // “短め”と“長め”が同時に立ったら無効化
  if (f.wantShort && f.wantLong) {
    f.wantShort = false;
    f.wantLong  = false;
  }
  return f;
}


// ---- JSON 1件を正規化（レガシー個別フィールドも吸収） ----
function toArray(x?: string | string[]): string[] {
  if (x == null) return [];
  if (Array.isArray(x)) return x;
  return String(x).split(/[,\s]+/).filter(Boolean);
}

function normalize(raw: IdeaRaw): Idea {
  const d = Number(raw.duration ?? 60);
  const set = new Set<NamespacedTag>([durationBucket(d)]);

  const push = (label: string) => {
    const t = String(label).trim();
    if (!t) return;
    if (t.includes(":")) { set.add(t as NamespacedTag); return; }
    const mapped = TAG_MAP[t.toLowerCase()] ?? TAG_MAP[t];
    if (mapped) mapped.forEach(v => set.add(v));
  };

  // 旧 tags[]
  for (const t of raw.tags ?? []) push(t);

  // レガシー個別フィールド
  toArray(raw.place).forEach(push);      // "indoor"/"outdoor"
  toArray(raw.outcomes).forEach(push);   // "refresh" など
  toArray(raw.mood).forEach(push);       // "relax"/"active"
  toArray(raw.party).forEach(push);      // "family"/"solo" など
  toArray(raw.kids).forEach(push);       // "ok"/"ng" → kids:ok は TAG_MAP 経由
  toArray(raw.cat).forEach(push);        // "study"/"food" など
  toArray(raw.extra_tags).forEach(push); // "free" など → outcome:budget に寄せる

  return { id: raw.id, title: raw.title, durationMin: d, tags: Array.from(set) };
}

// ---- 前処理（起動時一度）----
const ACTIVITIES: Idea[] = (activitiesJson as IdeaRaw[]).map(normalize);

// ---- タグ一致/必須条件 ----
function includesAllTags(have: NamespacedTag[], required: NamespacedTag[]) {
  if (!required.length) return true;
  const set = new Set(have.map(s => s.toLowerCase()));
  return required.every(tag => set.has(tag.toLowerCase()));
}

function bodyToRequiredPlaceTags(mood: RequestBody["mood"], flags: CondFlags): NamespacedTag[] {
  if (mood === "outdoor") return ["place:outdoor"];
  if (mood === "indoor")  return ["place:indoor"];
  if (flags.wantIndoor && !flags.wantOutdoor) return ["place:indoor"];
  if (!flags.wantIndoor && flags.wantOutdoor) return ["place:outdoor"];
  return []; // 両方 or どちらも → 制限なし
}

// ---- ソフト条件（加点）----
function buildSoftTags(body: RequestBody, flags: CondFlags): Set<NamespacedTag> {
  const s = new Set<NamespacedTag>();
  if (body.outcome) (OUTCOME_TO_ANY[body.outcome] ?? []).forEach(t => s.add(t));
  if (body.mood === "relax")  MOOD_TO_ANY.relax.forEach(t => s.add(t));
  if (body.mood === "active") MOOD_TO_ANY.active.forEach(t => s.add(t));

  const party = normalizePartyValue(body.party);
  if (party === "party:family") PARTY_TO_SOFT.family.forEach(t => s.add(t));

  if (flags.wantBudget) OUTCOME_TO_ANY.budget.forEach(t => s.add(t)); // 低予算はソフト寄せ
  return s;
}

function scoreBySoftTags(idea: Idea, soft: Set<NamespacedTag>): number {
  let s = 0;
  for (const t of idea.tags) if (soft.has(t)) s++;
  return s;
}

// ---- “ひとり”の保護（タイトルで複数人前提を避ける）----
function looksMultiPerson(title: string): boolean {
  const kw = [
    "親子","家族","ファミリー","兄弟","姉妹",
    "友だち","友達","ともだち","みんなで","対戦","試合","チーム",
    "キャッチボール","ダブルス","バトル","ペア","二人","二人で","一緒に",
    "子ども","子供","こども"
  ];
  return kw.some(w => title.includes(w));
}

function partyMatches(idea: { tags?: NamespacedTag[]; title?: string }, selected?: string): boolean {
  const want = normalizePartyValue(selected);
  if (!want) return true;
  const have = (idea.tags ?? []).filter((t) => t.startsWith("party:"));
  if (have.length > 0) return have.includes(want);
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

  const flags = normalizeConditions(body.conditions);
  const requiredPlace = bodyToRequiredPlaceTags(body.mood, flags);

  // base pool: place の必須条件
  let pool = ACTIVITIES.filter((it) => includesAllTags(it.tags, requiredPlace));

  // duration の必須条件（短め/長め）
  if (flags.wantShort && !flags.wantLong) {
    pool = pool.filter(it => it.durationMin <= 75);
  } else if (flags.wantLong && !flags.wantShort) {
    pool = pool.filter(it => it.durationMin >= 90);
  }

  // party の必須条件
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
    if (orNs.size) pool = pool.filter((it) => it.tags.some(tag => orNs.has(tag)));
  }

  // ソフト条件（低予算など）の加点
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
