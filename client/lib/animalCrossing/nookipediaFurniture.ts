// lib/data/animalcrossing/nookipediaFurniture.ts
import { buildQuery, NookipediaErrorPayload, nookipediaFetchRaw, sleep } from "./nookipedia";

export type NookipediaFurnitureCategory =
  | "Housewares"
  | "Miscellaneous"
  | "Wall-mounted"
  | "Ceiling decor";

export type NookipediaFurnitureColor =
  | "Aqua"
  | "Beige"
  | "Black"
  | "Blue"
  | "Brown"
  | "Colorful"
  | "Gray"
  | "Green"
  | "Orange"
  | "Pink"
  | "Purple"
  | "Red"
  | "White"
  | "Yellow";

export type FetchFurnitureNamesParams = {
  category?: NookipediaFurnitureCategory | string;
  color?: NookipediaFurnitureColor[]; // docs: may specify 1–2 colors
};

// Minimal flexible shape (single-item endpoint returns the richest structure)
export type NookipediaFurnitureItem = {
  name?: string;
  category?: string;

  image_url?: string;
  image_url_square?: string;

  variations?: any[];

  // API returns many extra keys (item_series, item_set, etc.)
  [k: string]: any;
};

export function normalizeFurnitureCategory(input?: string): string | undefined {
  if (!input) return undefined;

  const raw = String(input).trim();
  if (!raw) return undefined;

  const lower = raw.toLowerCase();
  if (lower === "housewares") return "Housewares";
  if (lower === "miscellaneous") return "Miscellaneous";
  if (lower === "wall-mounted" || lower === "wall mounted") return "Wall-mounted";
  if (lower === "ceiling decor" || lower === "ceiling-decor") return "Ceiling decor";

  return raw;
}

function parseStatusFromErrorMessage(msg: string): number | null {
  // Matches: "... failed (504): ..."
  const m = msg.match(/\((\d{3})\)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isRetryableStatus(status: number): boolean {
  // 504/503/502 are the common transient gateway/service errors
  // Keep 500 too, and allow a couple of CDN-style transient codes.
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

async function nookipediaFetch<T>(path: string): Promise<T> {
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

      // Only retry transient errors (504s are your big one)
      const retryable = status != null ? isRetryableStatus(status) : false;

      if (!retryable || attempt === retries) break;

      // backoff: 450ms, 900ms, 1350ms, 1800ms...
      await sleep(delay * (attempt + 1));
    }
  }

  throw lastErr ?? new Error("Nookipedia request failed.");
}

/**
 * ---------- Furniture Index Cache ----------
 * We keep ONE shared index in-memory with a TTL and one shared in-flight Promise.
 * This prevents hammering Nookipedia and makes Related items instant after warm-up.
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let furnitureIndexCache:
  | { fetchedAt: number; items: NookipediaFurnitureItem[] }
  | null = null;

let furnitureIndexPromise: Promise<NookipediaFurnitureItem[]> | null = null;

function isFresh(cache: typeof furnitureIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL furniture objects.
 * Uses memory cache + single in-flight request.
 */
export async function fetchFurnitureIndex(
  params?: {
    category?: NookipediaFurnitureCategory | string;
    color?: NookipediaFurnitureColor[]; // optional; API supports 1–2 colors
    force?: boolean; // bypass TTL cache
  }
): Promise<NookipediaFurnitureItem[]> {
  const force = !!params?.force;

  // If using filters, don't cache (filtered variants can explode memory and aren't what we want for Related)
  const hasFilters =
    !!normalizeFurnitureCategory(params?.category as any) ||
    (params?.color?.length ?? 0) > 0;

  if (!hasFilters && !force && isFresh(furnitureIndexCache)) {
    return furnitureIndexCache!.items;
  }

  if (!hasFilters && !force && furnitureIndexPromise) {
    return furnitureIndexPromise;
  }

  const category = normalizeFurnitureCategory(params?.category as any);

  const q = buildQuery({
    category,
    color: params?.color,
  });

  const run = async () => {
    try {
      // If filter query 5xx/504s, fallback to unfiltered list so the app keeps working
      try {
        const items = await nookipediaFetchWithRetry<NookipediaFurnitureItem[]>(`/nh/furniture${q}`);
        if (!hasFilters) {
          furnitureIndexCache = { fetchedAt: Date.now(), items };
        }
        return items;
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        const status = parseStatusFromErrorMessage(msg);
        const retryable = status != null ? isRetryableStatus(status) : false;

        if (retryable && hasFilters) {
          const q2 = buildQuery({});
          const items2 = await nookipediaFetchWithRetry<NookipediaFurnitureItem[]>(`/nh/furniture${q2}`);
          // cache only unfiltered
          furnitureIndexCache = { fetchedAt: Date.now(), items: items2 };
          return items2;
        }

        throw e;
      }
    } finally {
      // Only clear the shared promise for the unfiltered path (the one we share)
      if (!hasFilters) furnitureIndexPromise = null;
    }
  };

  if (!hasFilters) {
    furnitureIndexPromise = run();
    return furnitureIndexPromise;
  }

  // filtered path (no shared promise)
  return run();
}

/**
 * Warm the heavy index in the background (safe to call from Grid).
 * Returns the items if available, or null if it fails.
 */
export async function warmFurnitureIndex(): Promise<NookipediaFurnitureItem[] | null> {
  try {
    return await fetchFurnitureIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 * If category/color causes 5xx/504s, fallback to unfiltered list.
 */
export async function fetchFurnitureNames(
  params?: FetchFurnitureNamesParams
): Promise<string[]> {
  const category = normalizeFurnitureCategory(params?.category as any);

  const q = buildQuery({
    excludedetails: "true",
    category,
    color: params?.color,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/furniture${q}`);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    if (retryable && (category || (params?.color?.length ?? 0) > 0)) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/furniture${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single furniture item.
 * Supports thumbsize so we can request 256 (and fallback to 128).
 */
export async function fetchFurnitureByName(
  furniture: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaFurnitureItem> {
  const safe = encodeURIComponent((furniture ?? "").trim());

  const q = buildQuery({
    thumbsize:
      opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaFurnitureItem>(
    `/nh/furniture/${safe}${q}`
  );
}
