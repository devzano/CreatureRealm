// lib/data/animalcrossing/nookipediaClothing.ts
import { buildQuery, nookipediaFetchWithRetry, type NookipediaErrorPayload, sleep } from "./nookipedia";

export type NookipediaClothingItem = {
  name?: string;
  url?: string;
  category?: string;

  sell?: number;
  variation_total?: number;
  vill_equip?: boolean;
  seasonality?: string;
  version_added?: string;
  unlocked?: boolean;
  notes?: string;

  label_themes?: string[];
  styles?: string[];

  availability?: Array<{ from?: string; note?: string }>;
  buy?: Array<{ price?: number; currency?: string }>;

  variations?: Array<{
    variation?: string;
    image_url?: string;
    colors?: string[];
    [k: string]: any;
  }>;

  // API returns many extra keys
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
 * ---------- Clothing Index Cache ----------
 * Shared in-memory index + TTL + single in-flight Promise
 * (useful for related/filters later; cheap to warm)
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let clothingIndexCache: { fetchedAt: number; items: NookipediaClothingItem[] } | null = null;
let clothingIndexPromise: Promise<NookipediaClothingItem[]> | null = null;

function isFresh(cache: typeof clothingIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL clothing objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 */
export async function fetchClothingIndex(params?: {
  category?: string;
  style?: string;
  label_theme?: string;
  color?: string[];
  force?: boolean;
}): Promise<NookipediaClothingItem[]> {
  const force = !!params?.force;

  const hasFilters =
    !!String(params?.category ?? "").trim() ||
    !!String(params?.style ?? "").trim() ||
    !!String(params?.label_theme ?? "").trim() ||
    (params?.color?.length ?? 0) > 0;

  if (!hasFilters && !force && isFresh(clothingIndexCache)) {
    return clothingIndexCache!.items;
  }

  if (!hasFilters && !force && clothingIndexPromise) {
    return clothingIndexPromise;
  }

  const q = buildQuery({
    category: params?.category,
    style: params?.style,
    label_theme: params?.label_theme,
    color: params?.color,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaClothingItem[]>(`/nh/clothing${q}`);
      if (!hasFilters) clothingIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) clothingIndexPromise = null;
    }
  };

  if (!hasFilters) {
    clothingIndexPromise = run();
    return clothingIndexPromise;
  }

  return run();
}

export async function warmClothingIndex(): Promise<NookipediaClothingItem[] | null> {
  try {
    return await fetchClothingIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 * (Nookipedia supports this on list endpoints, same as your furniture usage)
 */
export async function fetchClothingNames(params?: {
  category?: string;
  style?: string;
  label_theme?: string;
  color?: string[];
}): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    category: params?.category,
    style: params?.style,
    label_theme: params?.label_theme,
    color: params?.color,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/clothing${q}`);
  } catch (e: any) {
    // if filters cause transient errors, fallback to unfiltered names so app still works
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters =
      !!String(params?.category ?? "").trim() ||
      !!String(params?.style ?? "").trim() ||
      !!String(params?.label_theme ?? "").trim() ||
      (params?.color?.length ?? 0) > 0;

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/clothing${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single clothing item.
 * Supports thumbsize.
 */
export async function fetchClothingByName(
  clothing: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaClothingItem> {
  const safe = encodeURIComponent((clothing ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaClothingItem>(`/nh/clothing/${safe}${q}`);
}
