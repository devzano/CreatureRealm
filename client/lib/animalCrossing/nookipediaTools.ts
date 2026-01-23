// lib/data/animalcrossing/nookipediaTools.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaToolItem = {
  name?: string;
  url?: string;

  uses?: number;
  hha_base?: number;
  sell?: number;

  customizable?: boolean;
  custom_kits?: number;
  custom_body_part?: string;

  version_added?: string;
  unlocked?: boolean;

  notes?: string;

  availability?: Array<{ from?: string; note?: string }>;

  // The API "buy" shape can vary; keep permissive
  buy?: any[];

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
 * ---------- Tools Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let toolsIndexCache: { fetchedAt: number; items: NookipediaToolItem[] } | null = null;
let toolsIndexPromise: Promise<NookipediaToolItem[]> | null = null;

function isFresh(cache: typeof toolsIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL tool objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 */
export async function fetchToolsIndex(params?: {
  category?: string;
  force?: boolean;
}): Promise<NookipediaToolItem[]> {
  const force = !!params?.force;

  const hasFilters = !!String(params?.category ?? "").trim();

  if (!hasFilters && !force && isFresh(toolsIndexCache)) {
    return toolsIndexCache!.items;
  }

  if (!hasFilters && !force && toolsIndexPromise) {
    return toolsIndexPromise;
  }

  const q = buildQuery({
    category: params?.category,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaToolItem[]>(`/nh/tools${q}`);
      if (!hasFilters) toolsIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) toolsIndexPromise = null;
    }
  };

  if (!hasFilters) {
    toolsIndexPromise = run();
    return toolsIndexPromise;
  }

  return run();
}

export async function warmToolsIndex(): Promise<NookipediaToolItem[] | null> {
  try {
    return await fetchToolsIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 */
export async function fetchToolNames(params?: { category?: string }): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    category: params?.category,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/tools${q}`);
  } catch (e: any) {
    // if filters cause transient errors, fallback to unfiltered names so app still works
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters = !!String(params?.category ?? "").trim();

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/tools${q2}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single tool.
 * Supports thumbsize.
 */
export async function fetchToolByName(
  tool: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaToolItem> {
  const safe = encodeURIComponent((tool ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaToolItem>(`/nh/tools/${safe}${q}`);
}
