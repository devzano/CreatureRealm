// lib/data/animalcrossing/nookipediaPhotos.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaPhotoItem = {
  name?: string;
  url?: string;
  category?: string;

  sell?: number;
  customizable?: boolean;
  custom_kits?: number;
  custom_kit_type?: string;
  custom_body_part?: string;

  interactable?: boolean;
  version_added?: string;
  unlocked?: boolean;

  grid_width?: number;
  grid_length?: number;

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
 * ---------- Photos Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let photosIndexCache: { fetchedAt: number; items: NookipediaPhotoItem[] } | null = null;
let photosIndexPromise: Promise<NookipediaPhotoItem[]> | null = null;

function isFresh(cache: typeof photosIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL photo objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 */
export async function fetchPhotosIndex(params?: {
  category?: string;
  color?: string[];
  force?: boolean;
}): Promise<NookipediaPhotoItem[]> {
  const force = !!params?.force;

  const hasFilters =
    !!String(params?.category ?? "").trim() || (params?.color?.length ?? 0) > 0;

  if (!hasFilters && !force && isFresh(photosIndexCache)) {
    return photosIndexCache!.items;
  }

  if (!hasFilters && !force && photosIndexPromise) {
    return photosIndexPromise;
  }

  const q = buildQuery({
    category: params?.category,
    color: params?.color,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaPhotoItem[]>(`/nh/photos${q}`);
      if (!hasFilters) photosIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) photosIndexPromise = null;
    }
  };

  if (!hasFilters) {
    photosIndexPromise = run();
    return photosIndexPromise;
  }

  return run();
}

export async function warmPhotosIndex(): Promise<NookipediaPhotoItem[] | null> {
  try {
    return await fetchPhotosIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 */
export async function fetchPhotoNames(params?: {
  category?: string;
  color?: string[];
}): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    category: params?.category,
    color: params?.color,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/photos${q}`);
  } catch (e: any) {
    // if filters cause transient errors, fallback to unfiltered names so app still works
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters =
      !!String(params?.category ?? "").trim() || (params?.color?.length ?? 0) > 0;

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/photos${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single photo item.
 * Supports thumbsize.
 */
export async function fetchPhotoByName(
  item: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaPhotoItem> {
  const safe = encodeURIComponent((item ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaPhotoItem>(`/nh/photos/${safe}${q}`);
}
