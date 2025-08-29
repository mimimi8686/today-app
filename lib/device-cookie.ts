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
  