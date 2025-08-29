// app/api/ideas/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type PostBody = {
  title: string;
  tags?: string[];
  durationMin?: number;
};

// 保存
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: PostBody = await req.json();
  const title = (body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data, error } = await supa
    .from("ideas")
    .insert({
      user_id: auth.user.id,
      title,
      tags: Array.isArray(body?.tags) ? body.tags : [],
      duration_min: Number.isFinite(body?.durationMin) ? Number(body!.durationMin) : 60,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// 一覧
export async function GET(req: Request) {
  const supa = supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 50, 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { data, error, count } = await supa
    .from("ideas")
    .select("*", { count: "exact" })
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    hasMore: count != null ? offset + limit < count : false,
  });
}
