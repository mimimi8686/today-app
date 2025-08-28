"use client";

type Item = { id: string; title: string; duration?: number };

function encodePlan(data: unknown) {
  const json = JSON.stringify(data);
  // URLセーフBase64（/plan の decodePlan と互換）
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64;
}

export default function CopyToPlanButton({
  ideas,
  startTime,
}: {
  ideas: Item[];
  startTime?: string;
}) {
  const onClick = async () => {
    const t = encodePlan({ items: ideas, startTime: startTime ?? "09:00" });
    const url = `${location.origin}/plan?t=${t}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("取り込みリンクをコピーしました。/plan が開きます。");
    } catch {}
    location.href = url;
  };

  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
    >
      このプランを自分のタイムラインに取り込む
    </button>
  );
}
