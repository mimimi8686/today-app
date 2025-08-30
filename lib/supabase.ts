// lib/supabase.ts
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js"; // ← 追加

/** クライアント（ブラウザ用） */
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

/** サーバ（API/Server Component/Route Handlers 用）— Cookie 連携（新方式） */
export const supabaseServer = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ← 旧: get/set/remove は NG。新: getAll/setAll を使う
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({ name, value, ...options });
            }
          } catch {
            // RSC など set 不可の環境ではここに来ることがあるが無視でOK
          }
        },
      },
    }
  );
};
/** サーバ（API専用・RLSを無視できる service role クライアント）← これを追加 */
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← anon ではなく service role
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    }
  );
