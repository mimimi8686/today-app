// /lib/user.ts
import "server-only";
import { cookies } from "next/headers";

export const USER_COOKIE = "uid";

/** Cookie から uid を読む（無ければ null） */
export async function readUserId(): Promise<string | null> {
  const bag = await cookies(); // ← Promise を await
  return bag.get(USER_COOKIE)?.value ?? null;
}
