// app/api/plans/route.ts  —— 認証なし / 端末Cookie / デバッグ出力つき
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
function setDeviceCookie(headers: Headers, deviceId: string, isHttps: boolean) {
  const base = `device_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax`;
  // ローカル(http)でも動くように Secure は https のときだけ
  headers.append("Set-Cookie", isHttps ? `${base}; Secure` : base);
}

// ---- 環境・接続の簡易ダイアグ ----
// /api/plans?debug=1 で確認できます（JSONで返します）
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("debug")) {
      return Response.json({
        ok: true,
        debug: {
          has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          device_id: readDeviceId(req) ?? null,
        },
      });
    }

    const deviceId = readDeviceId(req);
    if (!deviceId) return Response.json({ items: [] });

    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("plans")
      .select("id,title,payload,created_at")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
    return Response.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    console.error("GET /api/plans error:", e);
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// ---- 保存（POST）: { title, payload }
export async function POST(req: Request) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  try {
    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    const payload = body?.payload ?? null;
    if (!title || !payload) {
      return new Response(JSON.stringify({ ok: false, error: "title and payload are required" }), { status: 400, headers });
    }

    const isHttps = new URL(req.url).protocol === "https:";
    let deviceId = readDeviceId(req) ?? crypto.randomUUID();
    setDeviceCookie(headers, deviceId, isHttps);

    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("plans")
      .insert({ device_id: deviceId, title, payload })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
    }
    return new Response(JSON.stringify({ ok: true, id: data?.id }), { status: 201, headers });
  } catch (e: any) {
    console.error("POST /api/plans error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers });
  }
}
