// lib/data/animalcrossing/nookipediaGyroids.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaGyroidItem = {
  name?: string;
  url?: string;

  hha_base?: number;
  sell?: number;

  customizable?: boolean;
  custom_kits?: number;
  custom_kit_type?: string;
  custom_body_part?: string;
  cyrus_price?: number;

  variation_total?: number;

  grid_width?: number;
  grid_length?: number;

  sound?: string;
  version_added?: string;
  unlocked?: boolean;

  notes?: string;

  availability?: Array<{ from?: string; note?: string }>;
  buy?: Array<{ price?: number; currency?: string }>;

  variations?: Array<{
    variation?: string;
    image_url?: string;
    colors?: string[];
    [k: string]: any;
  }>;

  // API returns extra keys
  [k: string]: any;
};

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

/**
 * ---------- Gyroids Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let gyroidsIndexCache: { fetchedAt: number; items: NookipediaGyroidItem[] } | null = null;
let gyroidsIndexPromise: Promise<NookipediaGyroidItem[]> | null = null;

function isFresh(cache: typeof gyroidsIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL gyroid objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 */
export async function fetchGyroidsIndex(params?: {
  color?: string[];
  force?: boolean;
}): Promise<NookipediaGyroidItem[]> {
  const force = !!params?.force;

  const hasFilters = (params?.color?.length ?? 0) > 0;

  if (!hasFilters && !force && isFresh(gyroidsIndexCache)) {
    return gyroidsIndexCache!.items;
  }

  if (!hasFilters && !force && gyroidsIndexPromise) {
    return gyroidsIndexPromise;
  }

  const q = buildQuery({
    color: params?.color,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaGyroidItem[]>(`/nh/gyroids${q}`);
      if (!hasFilters) gyroidsIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) gyroidsIndexPromise = null;
    }
  };

  if (!hasFilters) {
    gyroidsIndexPromise = run();
    return gyroidsIndexPromise;
  }

  return run();
}

export async function warmGyroidsIndex(): Promise<NookipediaGyroidItem[] | null> {
  try {
    return await fetchGyroidsIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 */
export async function fetchGyroidNames(params?: { color?: string[] }): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    color: params?.color,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/gyroids${q}`);
  } catch (e: any) {
    // if filters cause transient errors, fallback to unfiltered names so app still works
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters = (params?.color?.length ?? 0) > 0;

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/gyroids${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single gyroid.
 * Supports thumbsize.
 */
export async function fetchGyroidByName(
  gyroid: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaGyroidItem> {
  const safe = encodeURIComponent((gyroid ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaGyroidItem>(`/nh/gyroids/${safe}${q}`);
}
