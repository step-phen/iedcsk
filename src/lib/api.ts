// Same host as the page on port 8000 by default, so cookies stay host-only on localhost and the LAN IP alike.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "");

function readXsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && readXsrfToken()) return;
  await fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: "include" });
}

/** Browser fetch to the Laravel API with session cookies and CSRF handled. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const send = async () => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (isMutation) headers.set("X-XSRF-TOKEN", readXsrfToken() ?? "");
    return fetch(`${API_URL}${path}`, { ...init, method, headers, credentials: "include" });
  };

  if (isMutation) await ensureCsrfCookie();
  let res = await send();

  // 419 means the CSRF token expired, so refresh it and retry once.
  if (res.status === 419) {
    await ensureCsrfCookie(true);
    res = await send();
  }
  await redirectOnLostAccess(res);
  return res;
}

// On teacher pages, a session ended elsewhere (deactivated after a handover, expired) goes to login; a pending handover to its accept page.
async function redirectOnLostAccess(res: Response) {
  // Learner devices have no login, and their 401s mean "pick your name again", so only teacher screens redirect.
  const path = window.location.pathname;
  if (!path.startsWith("/teacher") && path !== "/accept-handover") return;
  if (res.status === 401) {
    window.location.assign("/login");
  } else if (res.status === 403 && path !== "/accept-handover") {
    const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
    if (body?.code === "handover_pending") window.location.assign("/accept-handover");
  }
}

/** POSTs a FormData upload like apiFetch, but via XHR so onProgress gets the 0–100 percent sent; fetch cannot report upload progress. */
export async function apiUpload(path: string, body: FormData, onProgress: (percent: number) => void): Promise<Response> {
  const send = () =>
    new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}${path}`);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("X-XSRF-TOKEN", readXsrfToken() ?? "");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
      xhr.onerror = () => reject(new TypeError("Network request failed"));
      xhr.send(body);
    });

  await ensureCsrfCookie();
  let res = await send();
  if (res.status === 419) {
    await ensureCsrfCookie(true);
    onProgress(0);
    res = await send();
  }
  await redirectOnLostAccess(res);
  return res;
}
