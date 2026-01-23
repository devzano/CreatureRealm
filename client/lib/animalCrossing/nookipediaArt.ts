// lib/data/animalcrossing/nookipediaArt.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaArtInfo = {
  image_url?: string;
  texture_url?: string;
  description?: string;
  [k: string]: any;
};

export type NookipediaArtItem = {
  name?: string;
  url?: string;

  has_fake?: boolean;

  art_name?: string;
  art_type?: string; // Painting | Statue (etc)
  author?: string;
  year?: string;
  art_style?: string;

  buy?: number;
  sell?: number;
  availability?: string;

  width?: number;
  length?: number;

  real_info?: NookipediaArtInfo;
  fake_info?: NookipediaArtInfo;

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
 * ---------- Art Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let artIndexCache: { fetchedAt: number; items: NookipediaArtItem[] } | null = null;
let artIndexPromise: Promise<NookipediaArtItem[]> | null = null;

function isFresh(cache: typeof artIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL art objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 */
export async function fetchArtIndex(params?: {
  has_fake?: boolean;
  art_type?: string;
  force?: boolean;
}): Promise<NookipediaArtItem[]> {
  const force = !!params?.force;

  const hasFilters =
    params?.has_fake != null || !!String(params?.art_type ?? "").trim();

  if (!hasFilters && !force && isFresh(artIndexCache)) {
    return artIndexCache!.items;
  }

  if (!hasFilters && !force && artIndexPromise) {
    return artIndexPromise;
  }

  const q = buildQuery({
    has_fake: params?.has_fake != null ? String(params.has_fake) : undefined,
    art_type: params?.art_type,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaArtItem[]>(`/nh/art${q}`);
      if (!hasFilters) artIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) artIndexPromise = null;
    }
  };

  if (!hasFilters) {
    artIndexPromise = run();
    return artIndexPromise;
  }

  return run();
}

export async function warmArtIndex(): Promise<NookipediaArtItem[] | null> {
  try {
    return await fetchArtIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 */
export async function fetchArtNames(params?: {
  has_fake?: boolean;
  art_type?: string;
}): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    has_fake: params?.has_fake != null ? String(params.has_fake) : undefined,
    art_type: params?.art_type,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/art${q}`);
  } catch (e: any) {
    // same fallback behavior as Photos
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters =
      params?.has_fake != null || !!String(params?.art_type ?? "").trim();

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/art${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single art item.
 * Supports thumbsize.
 *
 * NOTE: Nookipedia endpoint is /nh/art/{artwork}
 */
export async function fetchArtByName(
  artwork: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaArtItem> {
  const safe = encodeURIComponent((artwork ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaArtItem>(`/nh/art/${safe}${q}`);
}
