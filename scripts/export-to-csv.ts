// scripts/export-to-csv.ts
import fs from "node:fs";
import path from "node:path";

type Row = { id: string; title: string; tags?: string[]; duration?: number };

// === 1) 入力 JSON を読む ===
const inputPath = path.join(process.cwd(), "data", "activities.json");
const raw = fs.readFileSync(inputPath, "utf-8");
const items: Row[] = JSON.parse(raw);

// === 2) タグ → 正規化 ===
// 既存の生タグから各列に落とし込むルール（必要に応じて増やしてOK）

const toPlace = (tags: string[]) => {
  if (tags.includes("indoor")) return "indoor";
  if (tags.includes("outdoor")) return "outdoor";
  return ""; // どちらでもない/未指定
};

const OUTCOME_TAGS = new Set([
  "smile","fun","refresh","stress","learning","achievement","relax","budget",
  "nature","hobby","experience","health","luxury","art","clean","talk"
]);
const toOutcomes = (tags: string[]): string[] =>
  tags.filter(t => OUTCOME_TAGS.has(t));

const toMood = (tags: string[]) => {
  if (tags.includes("relax"))  return "relax";
  if (tags.includes("active")) return "active";
  return "";
};

const toParty = (tags: string[]) => {
  if (tags.includes("solo"))     return "solo";
  if (tags.includes("family"))   return "family";
  if (tags.includes("partner"))  return "partner";
  if (tags.includes("friends"))  return "friends";
  return "";
};

const toKids = (tags: string[]) => (tags.includes("kids") ? "ok" : "");

const CAT_MAP: Record<string, string> = {
  // 既存タグ → カテゴリ
  food: "food",
  nature: "nature",
  art: "art",
  craft: "craft",
  exercise: "exercise",
  study: "study",
  cleaning: "cleaning",
  shopping: "shopping",
  entertainment: "entertainment",
  travel: "travel",
  wellness: "wellness",
  home: "home",
  errand: "errand",
  // 追加で使っていそうなものを薄く対応（必要に応じ整理）
  digital: "digital",
  organize: "organize",
};
const toCat = (tags: string[]): string[] => {
  const cats = new Set<string>();
  for (const t of tags) {
    const c = CAT_MAP[t];
    if (c) cats.add(c);
  }
  return [...cats];
};

// 判定に使わなかったタグ＝あとで確認したいタグ
const toExtra = (tags: string[], used: Set<string>) =>
  tags.filter(t => !used.has(t)).join(";");

// === 3) 1件を CSV レコードに ===
function mapRow(r: Row) {
  const tags = (r.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean);

  const place = toPlace(tags);

  const outcomes = toOutcomes(tags);
  const mood = toMood(tags);
  const party = toParty(tags);
  const kids = toKids(tags);
  const cat = toCat(tags);

  // 使ったタグを集める（extra 抽出用）
  const used = new Set<string>();
  if (place) used.add(place);
  outcomes.forEach(o => used.add(o));
  if (mood) used.add(mood);
  if (party) used.add(party);
  if (kids === "ok") used.add("kids");
  cat.forEach(c => used.add(c));
  // duration系・walk等は outcome/cat に寄せるか手作業で調整対象にする
  // ここでは extra_tags に残して後見直し
  const extra = toExtra(tags, used);

  return {
    id: r.id,
    title: r.title,
    duration: Number(r.duration ?? 60),
    place,
    outcomes: outcomes.join(";"),
    mood,
    party,
    kids,
    cat: cat.join(";"),
    extra_tags: extra,
  };
}

// === 4) 配列 -> CSV 文字列 ===
function toCSV(rows: ReturnType<typeof mapRow>[]) {
  const header = [
    "id","title","duration","place","outcomes","mood","party","kids","cat","extra_tags"
  ];
  const escape = (s: string | number) => {
    const str = String(s ?? "");
    // ダブルクォート/改行/カンマがあれば囲む
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      escape(r.id),
      escape(r.title),
      escape(r.duration),
      escape(r.place),
      escape(r.outcomes),
      escape(r.mood),
      escape(r.party),
      escape(r.kids),
      escape(r.cat),
      escape(r.extra_tags),
    ].join(","));
  }
  return lines.join("\n");
}

// === 5) 実行 ===
const mapped = items.map(mapRow);
const csv = toCSV(mapped);
const outDir = path.join(process.cwd(), "export");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "activities_sheet.csv");
fs.writeFileSync(outPath, csv, "utf-8");

console.log(`✅ Exported: ${outPath}`);
