// app/api/ideas/route.ts  — 端末Cookieで保存/取得（認証不要）
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } }
  );
}

// device_id cookie
function readDeviceId(req: Request) {
  const m = /(?:^|;\s*)device_id=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  return m?.[1];
}
function setDeviceCookie(headers: Headers, deviceId: string, isHttps: boolean) {
  const base = `device_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax`;
  headers.append("Set-Cookie", isHttps ? `${base}; Secure` : base);
}

// 保存（POST）: { title: string }
export async function POST(req: Request) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  try {
    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: "title is required" }), { status: 400, headers });
    }
    const isHttps = new URL(req.url).protocol === "https:";
    const deviceId = readDeviceId(req) ?? crypto.randomUUID();
    setDeviceCookie(headers, deviceId, isHttps);

    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("ideas")
      .insert({ title, device_id: deviceId })
      .select("id, title, created_at")
      .single();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
    }
    return new Response(JSON.stringify({ ok: true, item: data }), { status: 201, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers });
  }
}

// 一覧（GET）: device_id で自分の保存だけ取得
export async function GET(req: Request) {
  const deviceId = readDeviceId(req);
  if (!deviceId) return Response.json({ items: [] });

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("ideas")
    .select("id, title, created_at")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ items: data ?? [] });
}
