// lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,       // ← 既に設定済み
    process.env.SUPABASE_SERVICE_ROLE_KEY!,      // ← NEXT_PUBLIC なし
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
