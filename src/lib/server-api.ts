import { cookies, headers } from "next/headers";

// Next's server reaches Laravel directly; override when the API runs on another host.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

/** Server Component fetch to the Laravel API, forwarding the browser's session cookie. */
export async function serverApi(path: string, init: RequestInit = {}): Promise<Response> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const host = headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  const outgoing = new Headers(init.headers);
  outgoing.set("Accept", "application/json");
  outgoing.set("Cookie", cookieStore.toString());
  // Sanctum only treats a request as stateful when its origin is a listed frontend.
  outgoing.set("Origin", `${proto}://${host}`);
  outgoing.set("Referer", `${proto}://${host}/`);

  return fetch(`${API_URL}${path}`, { ...init, headers: outgoing, cache: "no-store" });
}
