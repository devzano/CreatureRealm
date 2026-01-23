// lib/data/animalcrossing/nookipedia.ts
const NOOKIPEDIA_BASE = "https://api.nookipedia.com";

export type NookipediaErrorPayload = {
  title?: string;
  details?: string;
  [k: string]: any;
};

function getApiKey(): string {
  const key = (process.env.EXPO_PUBLIC_NOOKIPEDIA_API_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "Missing Nookipedia API key. Set EXPO_PUBLIC_NOOKIPEDIA_API_KEY in your environment."
    );
  }
  return key;
}

export async function nookipediaFetchRaw(path: string) {
  const apiKey = getApiKey();

  return fetch(`${NOOKIPEDIA_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "X-API-KEY": apiKey,
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
