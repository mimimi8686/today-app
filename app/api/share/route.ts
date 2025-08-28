// /app/api/share/route.ts
import { NextResponse } from "next/server";
import { createShortLink } from "@/lib/shortlink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = createShortLink(body);
  return NextResponse.json({ id, url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/s/${id}` });
}
