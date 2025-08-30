// lib/device-cookie.ts

export function readDeviceId(req: Request) {
  const m = /(?:^|;\s*)device_id=([^;]+)/.exec(req.headers.get("cookie") ?? "");
  return m?.[1];
}

export function setDeviceCookie(headers: Headers, deviceId: string) {
  headers.append(
    "Set-Cookie",
    `device_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
  );
}

// ★ 追加：サーバ側で呼び出す便利関数
import { cookies } from "next/headers";

const COOKIE_NAME = "device_id";
const MAX_AGE = 400 * 24 * 60 * 60; // 約400日

export function getOrSetDeviceId() {
  const jar = cookies();
  const exist = jar.get(COOKIE_NAME)?.value;
  if (exist) return exist;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  jar.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });

  return id;
}
