// /lib/tag-labels.ts
// 名前空間タグ -> 日本語ラベル。null を返したものは表示しない。
export function labelFromTag(tag: string): string | null {
    // すでに人間向けの語ならそのまま
    if (!tag.includes(":")) return tag;
  
    const [ns, val] = tag.split(":");
  
    switch (ns) {
      case "party":
        if (val === "solo") return "1人";
        if (val === "family") return "家族";
        if (val === "partner") return "パートナー";
        if (val === "friends") return "友だち";
        return null;
  
      case "place":
        if (val === "indoor") return "屋内";
        if (val === "outdoor") return "屋外";
        return null;
  
      case "outcome":
        return (
          {
            smile: "笑顔になりたい",
            fun: "楽しい",
            refresh: "リフレッシュ",
            stress: "ストレス発散",
            learning: "学びたい",
            achievement: "達成感",
            relax: "癒やされたい",
            budget: "節約したい",
            nature: "自然と触れる",
            hobby: "趣味を見つける",
            experience: "体験したい",
            health: "健康",
            luxury: "ちょっと贅沢",
            art: "アート・文学",
            clean: "片づけ",
            talk: "おしゃべり",
          } as Record<string, string | undefined>
        )[val] ?? null;
  
      case "cat":
        return (
          {
            nature: "自然",
            food: "食べ物",
            exercise: "運動",
            study: "学び",
            art: "アート・文学",
            cleaning: "片づけ",
            shopping: "買い物",
            entertainment: "エンタメ",
            travel: "おでかけ",
            wellness: "ウェルネス",
            home: "おうち",
            hobby: "趣味",
          } as Record<string, string | undefined>
        )[val] ?? null;
  
      case "dur":
        return (
          {
            "15m": "〜15分",
            "30m": "〜30分",
            "45m": "〜45分",
            "60m": "〜60分",
            "90m": "〜90分",
            "120m": "〜120分",
            halfday: "半日",
            fullday: "1日",
          } as Record<string, string | undefined>
        )[val] ?? null;
  
      case "kids":
        if (val === "ok") return "子連れOK";
        return null;
  
      default:
        return null; // 未対応の名前空間は非表示
    }
  }
  