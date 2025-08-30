// app/api/plans/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 保存（タイトルは空でもOK：サーバー側で自動命名）
export async function POST(req: Request) {
  const supa = supabaseServer();

  const body = await req.json().catch(() => ({}));
  const rawTitle = (body?.title ?? "").trim();
  const payload = body?.payload ?? null;

  if (!payload?.items || !Array.isArray(payload.items)) {
    return NextResponse.json({ error: "payload.items is required" }, { status: 400 });
  }

  // 空なら自動命名（例：タイムライン 2025/08/30 14:09）
  const d = new Date();
  const fallback =
    `タイムライン ` +
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ` +
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const title = rawTitle || fallback;

  const { data, error } = await supa
    .from("plans")
    .insert({
      user_id: null, // 開発中は誰でも保存
      title,
      payload,
      device_id: body?.device_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// 一覧（既存のままならそのままでOK。参考）
// export async function GET(req: Request) { ... }
