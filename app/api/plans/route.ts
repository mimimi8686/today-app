import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 保存
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title = (body?.title ?? "").trim();
  const payload = body?.payload ?? null;

  if (!title || !payload) {
    return NextResponse.json({ error: "title and payload are required" }, { status: 400 });
  }

  const { data, error } = await supa
    .from("plans")
    .insert({
      user_id: auth.user.id,
      title,
      payload,
      device_id: body?.device_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

// 一覧
export async function GET(req: Request) {
  const supa = supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 50, 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { data, error, count } = await supa
    .from("plans")
    .select("*", { count: "exact" })
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    hasMore: count != null ? offset + limit < count : false,
  });
}
