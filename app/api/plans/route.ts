// app/api/plans/route.ts
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase"; // ← ログインしていれば user_id を拾うため
import { createClient } from "@supabase/supabase-js";

// Admin（Service Role）クライアント（ブラウザには絶対出さない）
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← NEXT_PUBLIC なしの環境変数
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } }
  );
}

// 端末Cookie（未ログイン用）
function readDeviceId(req: Request) {
  const m = /(?:^|;\s*)device_id=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  return m?.[1];
}
function setDeviceCookie(headers: Headers, deviceId: string) {
  headers.append(
    "Set-Cookie",
    `device_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
  );
}

// --------- 保存（POST）---------
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const payload = body?.payload ?? null;
  if (!title || !payload) {
    return Response.json({ ok: false, error: "title and payload are required" }, { status: 400 });
  }

  // ログインしていたら user_id を使う／していなければ device_id を使う
  const { data: auth } = await supabaseServer().auth.getUser().catch(() => ({ data: null as any }));
  let userId: string | null = auth?.user?.id ?? null;

  let deviceId = readDeviceId(req) ?? crypto.randomUUID();
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  setDeviceCookie(headers, deviceId); // 毎回延長（ない場合は新規発行）

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("plans")
    .insert({ user_id: userId, device_id: deviceId, title, payload })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
  }
  return new Response(JSON.stringify({ ok: true, id: data?.id }), { status: 201, headers });
}

// --------- 一覧（GET）---------
export async function GET(req: Request) {
  const { data: auth } = await supabaseServer().auth.getUser().catch(() => ({ data: null as any }));
  const supa = supabaseAdmin();

  let query = supa
    .from("plans")
    .select("id,title,payload,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (auth?.user?.id) {
    query = query.eq("user_id", auth.user.id);
  } else {
    const deviceId = readDeviceId(req);
    if (!deviceId) return Response.json({ items: [] });
    query = query.eq("device_id", deviceId);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ items: data ?? [] });
}
