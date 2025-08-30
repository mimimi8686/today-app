// app/api/plans/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getOrSetDeviceId } from "@/lib/device-cookie";


export const runtime = "edge";
export const dynamic = "force-dynamic";

// ----------------------
// 保存（POST）
// ----------------------
export async function POST(req: Request) {
  // RLSに縛られないService Roleで実行（キーはサーバ側でのみ保持）
  const supa = supabaseAdmin();
  // 端末IDはサーバ側で強制付与（クライアントから受け取らない）
  const deviceId = getOrSetDeviceId();

  const body = await req.json().catch(() => ({}));
  const rawTitle = (body?.title ?? "").trim();
  const payload = body?.payload ?? null;

  if (!payload?.items || !Array.isArray(payload.items)) {
    return NextResponse.json({ error: "payload.items is required" }, { status: 400 });
  }

  // 保存対象外のキーは落とす（開始/件数など）
  if (payload?.startTime) delete payload.startTime;
  if (payload?.count) delete payload.count;

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
      user_id: null,
      title,
      payload,
      device_id: deviceId, // ← サーバ側で付与。body.device_id は使わない
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}


// ----------------------
// 一覧（GET）
// ----------------------
export async function GET() {
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

// ----------------------
// 更新（PATCH）
// ----------------------
export async function PATCH(req: Request) {
  const supa = supabaseAdmin();
  const body = await req.json().catch(() => ({}));

  const id = body?.id;
  const newTitle = (body?.title ?? "").trim();

  if (!id || !newTitle) {
    return NextResponse.json({ error: "id and title are required" }, { status: 400 });
  }

  const { data, error } = await supa
    .from("plans")
    .update({ title: newTitle })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// ----------------------
// 削除（DELETE）
// ----------------------
export async function DELETE(req: Request) {
  const supa = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const id = body?.id;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supa.from("plans").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
