"use client";
import { useState } from "react";

type Props = {
  title: string;
  tags?: string[];
  durationMin?: number;
};

export default function SaveIdeaButton({ title, tags = [], durationMin = 60 }: Props) {
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setSaving(true);
    setOk(null);
    setErr(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, tags, durationMin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "failed");
      setOk("保存しました");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={saving}
        className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
        type="button"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
      {ok && <span className="text-green-600 text-sm">{ok}</span>}
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </div>
  );
}
