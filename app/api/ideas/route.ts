// app/api/ideas/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";    // ← service-role を使う
import { readDeviceId, setDeviceCookie } from "@/lib/device-cookie";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Cookie から device_id を取得。無ければ発行して Set-Cookie
function getOrSetDeviceId(req: Request, headers: Headers) {
  let id = readDeviceId(req);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setDeviceCookie(headers, id);
  }
  return id;
}

// -------- 保存（POST） --------
export async function POST(req: Request) {
  const headers = new Headers();
  const supa = supabaseAdmin();    // ← ここ
  const deviceId = getOrSetDeviceId(req, headers);

  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400, headers });
  }

  // 端末ごとの重複チェック（device_id + title）
  const { data: found, error: findErr } = await supa
    .from("ideas")
    .select("id")
    .eq("device_id", deviceId)
    .eq("title", title)
    .limit(1)
    .maybeSingle();

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 400, headers });

  if (found) {
    // 既に保存済みでも成功扱いにしておく
    return NextResponse.json({ ok: true, existed: true, id: found.id }, { status: 200, headers });
  }

  const { data, error } = await supa
    .from("ideas")
    .insert({ device_id: deviceId, title })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers });
  return NextResponse.json(data, { status: 201, headers });
}

// -------- 一覧（GET） --------
export async function GET(req: Request) {
  const headers = new Headers();
  const supa = supabaseAdmin();
  const deviceId = getOrSetDeviceId(req, headers);

  const { data, error } = await supa
    .from("ideas")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers });
  return NextResponse.json({ items: data ?? [] }, { headers });
}

// -------- 削除（DELETE） --------
export async function DELETE(req: Request) {
  const headers = new Headers();
  const supa = supabaseAdmin();
  const deviceId = getOrSetDeviceId(req, headers);

  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400, headers });

  const { error } = await supa.from("ideas").delete().eq("id", id).eq("device_id", deviceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers });

  return NextResponse.json({ ok: true }, { headers });
}
