/* eslint-disable no-console */
import { config } from "dotenv";
config({ path: ".env.local" }); // これを一番最初に
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

type IdeaRaw = {
  id: string;
  title: string;
  duration?: number;
  place?: string;         // "indoor"
  outcomes?: string;      // "learning, fun"
  mood?: string;          // "relax"
  party?: string;         // "solo, partner"
  kids?: string;          // "ok"
  cat?: string;           // "food, cooking"
  extra_tags?: string;    // "free"
};

type NamespacedTag =
  | `place:${"indoor"|"outdoor"}`
  | `outcome:${"smile"|"fun"|"refresh"|"stress"|"learning"|"achievement"|"relax"|"budget"|"nature"|"hobby"|"experience"|"health"|"luxury"|"art"|"clean"|"talk"}`
  | `mood:${"relax"|"active"}`
  | `party:${"solo"|"family"|"partner"|"friends"}`
  | `cat:${"nature"|"food"|"exercise"|"study"|"art"|"cleaning"|"shopping"|"entertainment"|"travel"|"wellness"|"home"|"errand"|"hobby"|"digital"|"craft"|"selfcare"|"organize"}`
  | `dur:${"15m"|"30m"|"45m"|"60m"|"90m"|"120m"|"halfday"|"fullday"}`
  | `kids:${"ok"|"ng"}`;

function toArr(csv?: string) {
  if (!csv) return [] as string[];
  return csv.split(",").map(s => s.trim()).filter(Boolean);
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

// 素の値 → namespaced マッピング
const MAP: Record<string, NamespacedTag[]> = {
  indoor: ["place:indoor"], 屋内: ["place:indoor"],
  outdoor: ["place:outdoor"], 屋外: ["place:outdoor"],

  relax: ["mood:relax"], active: ["mood:active"],

  solo: ["party:solo"], family: ["party:family"], partner: ["party:partner"], friends: ["party:friends"],

  learning: ["outcome:learning"], fun: ["outcome:fun"], refresh: ["outcome:refresh"],
  achievement: ["outcome:achievement"], clean: ["outcome:clean"], relax2: ["outcome:relax"],
  budget: ["outcome:budget"], nature: ["outcome:nature"], art: ["outcome:art"], hobby: ["outcome:hobby"],
  experience: ["outcome:experience"], health: ["outcome:health"], luxury: ["outcome:luxury"], talk: ["outcome:talk"],
  stress: ["outcome:stress"],

  food: ["cat:food"], cooking: ["cat:food","cat:hobby"],
  cleaning: ["cat:cleaning"], home: ["cat:home"],
  entertainment: ["cat:entertainment"], digital: ["cat:digital"], craft: ["cat:craft"],
  selfcare: ["cat:selfcare"], organize: ["cat:organize"],
};

function pushMapped(set: Set<NamespacedTag>, raw: string) {
  const k = raw.trim();
  if (!k) return;
  if (k.includes(":")) { set.add(k as NamespacedTag); return; }
  const lower = k.toLowerCase();
  (MAP[lower] ?? []).forEach(t => set.add(t));
}

// JSON1件 → DB行に正規化
function normalize(raw: IdeaRaw) {
  const d = Number(raw.duration ?? 60);
  const set = new Set<NamespacedTag>([durationBucket(d)]);

  if (raw.place) pushMapped(set, raw.place);
  if (raw.mood)  pushMapped(set, raw.mood);
  for (const x of toArr(raw.outcomes))   pushMapped(set, x);
  for (const x of toArr(raw.party))      pushMapped(set, x);
  for (const x of toArr(raw.kids))       pushMapped(set, x === "ok" ? "kids:ok" : x);
  for (const x of toArr(raw.cat))        pushMapped(set, x);
  for (const x of toArr(raw.extra_tags)) pushMapped(set, x);

  return {
    source_id: raw.id,
    title: raw.title,
    duration_min: d,
    tags: [...set] as string[],
    is_seed: true,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    console.error("❌ SUPABASE URL or SERVICE ROLE KEY is missing.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // data/activities.json を読む（プロジェクト直下に data/ を想定）
  const jsonPath = path.join(process.cwd(), "data", "activities.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const items = JSON.parse(raw) as IdeaRaw[];

  const rows = items.map(normalize);

  const { data, error } = await supabase
    .from("activities")
    .upsert(rows, { onConflict: "source_id" })
    .select("source_id, title");

  if (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`✅ Seed done. inserted/updated: ${data?.length ?? 0}`);
}

main();
