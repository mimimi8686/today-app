// app/api/plans/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getOrSetDeviceId } from "@/lib/device-cookie";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** 共通: 中間キャッシュ禁止 */
function noStore<T extends NextResponse>(res: T): T {
  res.headers.set("Cache-Control", "no-store, max-age=0, private");
  return res;
}

// ----------------------
// 保存（POST）
// ----------------------
export async function POST(req: Request) {
  const supa = supabaseAdmin();
  const deviceId = getOrSetDeviceId(); // サーバ側で必ず付与

  const body = await req.json().catch(() => ({}));
  const rawTitle = (body?.title ?? "").trim();
  const payload = body?.payload ?? null;

  if (!payload?.items || !Array.isArray(payload.items)) {
    return noStore(NextResponse.json({ error: "payload.items is required" }, { status: 400 }));
  }

  // 保存対象外のキーは落とす
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
      device_id: deviceId, // クライアントからは受け取らない
    })
    .select()
    .single();

  if (error) return noStore(NextResponse.json({ error: error.message }, { status: 400 }));
  return noStore(NextResponse.json(data, { status: 201 }));
}

// ----------------------
// 一覧（GET）
// ----------------------
export async function GET() {
  const supa = supabaseAdmin();
  const deviceId = getOrSetDeviceId(); // ← ここで必ずスコープを確定

  const { data, error } = await supa
    .from("plans")
    .select("*")
    .eq("device_id", deviceId) // ← 他デバイスの行は返さない
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return noStore(NextResponse.json({ error: error.message }, { status: 400 }));
  return noStore(NextResponse.json({ items: data ?? [] }));
}

// ----------------------
// 更新（PATCH）
// ----------------------
export async function PATCH(req: Request) {
  const supa = supabaseAdmin();
  const deviceId = getOrSetDeviceId(); // 所有者チェックに使う
  const body = await req.json().catch(() => ({}));

  const id = body?.id;
  const newTitle = (body?.title ?? "").trim();

  if (!id || !newTitle) {
    return noStore(NextResponse.json({ error: "id and title are required" }, { status: 400 }));
  }

  // 自デバイスの行だけ更新可能
  const { data, error } = await supa
    .from("plans")
    .update({ title: newTitle })
    .eq("id", id)
    .eq("device_id", deviceId)
    .select()
    .single();

  if (error) return noStore(NextResponse.json({ error: error.message }, { status: 400 }));
  return noStore(NextResponse.json(data));
}

// ----------------------
// 削除（DELETE）
// ----------------------
export async function DELETE(req: Request) {
  const supa = supabaseAdmin();
  const deviceId = getOrSetDeviceId(); // 所有者チェック
  const body = await req.json().catch(() => ({}));
  const id = body?.id;

  if (!id) {
    return noStore(NextResponse.json({ error: "id is required" }, { status: 400 }));
  }

  // 自デバイスの行だけ削除可能
  const { error } = await supa
    .from("plans")
    .delete()
    .eq("id", id)
    .eq("device_id", deviceId);

  if (error) return noStore(NextResponse.json({ error: error.message }, { status: 400 }));
  return noStore(NextResponse.json({ ok: true }));
}
