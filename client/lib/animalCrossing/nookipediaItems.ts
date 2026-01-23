// lib/data/animalcrossing/nookipediaItems.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaItemAvailability = {
  from?: string;
  note?: string;
  [k: string]: any;
};

export type NookipediaItemBuy = {
  price?: number;
  currency?: string;
  [k: string]: any;
};

export type NookipediaItem = {
  name?: string;
  url?: string;
  image_url?: string;

  stack?: number;
  hha_base?: number;
  sell?: number;

  is_fence?: boolean;

  material_type?: string; // e.g. "Tree"
  material_seasonality?: string; // e.g. "Autumn"

  material_sort?: number;
  material_name_sort?: number;
  material_seasonality_sort?: number;

  edible?: boolean;
  plant_type?: string;

  version_added?: string;
  unlocked?: boolean;

  notes?: string;

  availability?: NookipediaItemAvailability[];
  buy?: NookipediaItemBuy[];

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
 * ---------- Items Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let itemsIndexCache: { fetchedAt: number; items: NookipediaItem[] } | null = null;
let itemsIndexPromise: Promise<NookipediaItem[]> | null = null;

function isFresh(cache: typeof itemsIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL item objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 *
 * NOTE: The /nh/items endpoint is broad. If you don't want any filters yet,
 * you can simply not pass them — caching will work unfiltered.
 */
export async function fetchItemsIndex(params?: {
  material_type?: string;
  material_seasonality?: string;
  is_fence?: boolean;
  edible?: boolean;
  force?: boolean;
}): Promise<NookipediaItem[]> {
  const force = !!params?.force;

  const hasFilters =
    !!String(params?.material_type ?? "").trim() ||
    !!String(params?.material_seasonality ?? "").trim() ||
    params?.is_fence != null ||
    params?.edible != null;

  if (!hasFilters && !force && isFresh(itemsIndexCache)) {
    return itemsIndexCache!.items;
  }

  if (!hasFilters && !force && itemsIndexPromise) {
    return itemsIndexPromise;
  }

  const q = buildQuery({
    material_type: params?.material_type,
    material_seasonality: params?.material_seasonality,
    is_fence: params?.is_fence != null ? String(params.is_fence) : undefined,
    edible: params?.edible != null ? String(params.edible) : undefined,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaItem[]>(`/nh/items${q}`);
      if (!hasFilters) itemsIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) itemsIndexPromise = null;
    }
  };

  if (!hasFilters) {
    itemsIndexPromise = run();
    return itemsIndexPromise;
  }

  return run();
}

export async function warmItemsIndex(): Promise<NookipediaItem[] | null> {
  try {
    return await fetchItemsIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 */
export async function fetchItemNames(params?: {
  material_type?: string;
  material_seasonality?: string;
  is_fence?: boolean;
  edible?: boolean;
}): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    material_type: params?.material_type,
    material_seasonality: params?.material_seasonality,
    is_fence: params?.is_fence != null ? String(params.is_fence) : undefined,
    edible: params?.edible != null ? String(params.edible) : undefined,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/items${q}`);
  } catch (e: any) {
    // same fallback behavior as Photos
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters =
      !!String(params?.material_type ?? "").trim() ||
      !!String(params?.material_seasonality ?? "").trim() ||
      params?.is_fence != null ||
      params?.edible != null;

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/items${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single item.
 * Supports thumbsize.
 *
 * NOTE: Nookipedia endpoint is /nh/items/{item}
 */
export async function fetchItemByName(
  item: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaItem> {
  const safe = encodeURIComponent((item ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaItem>(`/nh/items/${safe}${q}`);
}
