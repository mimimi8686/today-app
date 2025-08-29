// app/api/plans/route.ts  —— 認証なし・端末Cookieで保存
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

// Admin（Service Role）クライアント：サーバ専用
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } }
  );
}

// 端末Cookie（device_id）
function readDeviceId(req: Request) {
  const m = /(?:^|;\s*)device_id=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  return m?.[1];
}
function setDeviceCookie(headers: Headers, deviceId: string) {
  // 本番(HTTPS)前提。ローカルHTTPで使うときは Secure を外す
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

  // device_id を読み取り。なければ発行してSet-Cookie
  let deviceId = readDeviceId(req) ?? crypto.randomUUID();
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  setDeviceCookie(headers, deviceId);

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("plans")
    .insert({ device_id: deviceId, title, payload })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
  }
  return new Response(JSON.stringify({ ok: true, id: data?.id }), { status: 201, headers });
}

// --------- 履歴取得（GET）---------
export async function GET(req: Request) {
  const deviceId = readDeviceId(req);
  if (!deviceId) return Response.json({ items: [] });

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("plans")
    .select("id,title,payload,created_at")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ items: data ?? [] });
}
