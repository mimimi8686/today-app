// app/api/ideas/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { readDeviceId, setDeviceCookie } from "@/lib/device-cookie";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 端末IDを取得（無ければ発行して Set-Cookie する）
function ensureDevice(req: Request) {
  const headers = new Headers();
  let deviceId = readDeviceId(req);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    setDeviceCookie(headers, deviceId);
  }
  return { deviceId, headers };
}

// ----------------------
// 保存（POST）
// body: { title: string }
// ----------------------
export async function POST(req: Request) {
  const { deviceId, headers } = ensureDevice(req);
  const supa = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").trim();

  if (!title) {
    return new NextResponse(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers,
    });
  }

  // すでに同じタイトルがあれば作らない（端末ごと）
  const { data: exists, error: selErr } = await supa
    .from("ideas")
    .select("id, title, created_at")
    .eq("device_id", deviceId)
    .ilike("title", title) // 大文字小文字を無視した一致
    .limit(1)
    .maybeSingle();

  if (selErr) {
    return new NextResponse(JSON.stringify({ error: selErr.message }), {
      status: 400,
      headers,
    });
  }

  if (exists) {
    return new NextResponse(
      JSON.stringify({ duplicated: true, item: exists }),
      { status: 200, headers }
    );
  }

  // 新規作成
  const { data, error } = await supa
    .from("ideas")
    .insert({
      user_id: null, // 匿名
      device_id: deviceId,
      title,
      payload: null,
    })
    .select("id, title, created_at")
    .single();

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }

  return new NextResponse(JSON.stringify(data), { status: 201, headers });
}

// ----------------------
// 一覧（GET）— 端末ごとに取得
// ----------------------
export async function GET(req: Request) {
  const { deviceId, headers } = ensureDevice(req);
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("ideas")
    .select("id, title, created_at")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }
  return new NextResponse(JSON.stringify({ items: data ?? [] }), {
    status: 200,
    headers,
  });
}

// ----------------------
// 削除（DELETE）— body: { id }
// ----------------------
export async function DELETE(req: Request) {
  const { deviceId, headers } = ensureDevice(req);
  const supa = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const id = body?.id;

  if (!id) {
    return new NextResponse(JSON.stringify({ error: "id is required" }), {
      status: 400,
      headers,
    });
  }

  // 端末スコープで安全に削除
  const { error } = await supa
    .from("ideas")
    .delete()
    .eq("id", id)
    .eq("device_id", deviceId);

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
