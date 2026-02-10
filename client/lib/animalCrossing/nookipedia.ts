// lib/data/animalcrossing/nookipedia.ts
const NOOKIPEDIA_ACCEPT_VERSION = String("1.7.0").trim();

export type NookipediaErrorPayload = {
  title?: string;
  details?: string;
  [k: string]: any;
};

function getProxyBase(): string {
  // EXPO_PUBLIC_RENDER_BASE_URL=https://creaturerealm.onrender.com
  const base = (process.env.EXPO_PUBLIC_RENDER_BASE_URL ?? "").trim();

  if (!base) {
    throw new Error(
      "Missing Render base URL."
    );
  }

  return base.replace(/\/+$/, "");
}

export async function nookipediaFetchRaw(path: string) {
  const proxyBase = getProxyBase();

  // GET {proxyBase}/nookipedia{path}
  return fetch(`${proxyBase}/nookipedia${path}`, {
    headers: {
      Accept: "application/json",
      "Accept-Version": NOOKIPEDIA_ACCEPT_VERSION,
    },
  });
}

export async function nookipediaFetch<T>(path: string): Promise<T> {
  const res = await nookipediaFetchRaw(path);

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    let parsed: NookipediaErrorPayload | null = null;
    try {
      parsed = body ? (JSON.parse(body) as any) : null;
    } catch {}

    const detail = parsed?.details ? ` ${parsed.details}` : "";
    const title = parsed?.title ? `${parsed.title}.` : "";

    throw new Error(
      `Nookipedia request failed (${res.status}): ${title}${detail || body || res.statusText}`
    );
  }

  return (await res.json()) as T;
}

function parseStatusFromErrorMessage(msg: string): number | null {
  const m = msg.match(/\((\d{3})\)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isRetryableStatus(status: number): boolean {
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 520 ||
    status === 522 ||
    status === 524 ||
    status === 408 ||
    status === 429
  );
}

export async function nookipediaFetchWithRetry<T>(
  path: string,
  opts?: { retries?: number; retryDelayMs?: number }
): Promise<T> {
  const retries = Math.max(0, opts?.retries ?? 4);
  const delay = Math.max(0, opts?.retryDelayMs ?? 450);

  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await nookipediaFetch<T>(path);
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message ?? "");
      const status = parseStatusFromErrorMessage(msg);

      const retryable = status != null ? isRetryableStatus(status) : false;
      if (!retryable || attempt === retries) break;

      await sleep(delay * (attempt + 1));
    }
  }

  throw lastErr ?? new Error("Nookipedia request failed.");
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildQuery(params: Record<string, any>) {
  const parts: string[] = [];

  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;

    if (Array.isArray(v)) {
      v.forEach((vv) => {
        if (vv == null || String(vv).trim() === "") return;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(vv))}`);
      });
      return;
    }

    const s = String(v).trim();
    if (!s) return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(s)}`);
  });

  return parts.length ? `?${parts.join("&")}` : "";
}
