import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 1件取得（必要なら）
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data, error } = await supa.from("plans").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// タイトル編集
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const supa = supabaseServer();
  const { data, error } = await supa.from("plans").update({ title }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// 削除
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { error } = await supa.from("plans").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
