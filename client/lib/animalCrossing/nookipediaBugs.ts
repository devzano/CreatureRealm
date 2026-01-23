// lib/data/animalcrossing/nookipediaBugs.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaAvailabilityRange = {
  months?: string;
  time?: string;
  [k: string]: any;
};

export type NookipediaHemisphereAvailability = {
  availability_array?: NookipediaAvailabilityRange[];
  times_by_month?: Record<string, string>; // keys "1"..."12"
  months?: string; // "All year" or "Jul – Sep"
  months_array?: number[];
  [k: string]: any;
};

export type NookipediaBugItem = {
  url?: string;
  name?: string;
  number?: number;

  image_url?: string;
  render_url?: string;

  location?: string; // e.g. "On the ground"
  weather?: string;  // e.g. "Any except rain"
  rarity?: string;

  total_catch?: number;
  sell_nook?: number;
  sell_flick?: number;

  tank_width?: number;
  tank_length?: number;

  catchphrases?: string[];

  // Availability blocks
  north?: NookipediaHemisphereAvailability;
  south?: NookipediaHemisphereAvailability;

  [k: string]: any;
};

export async function fetchBugNames(params?: { month?: string }): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    month: params?.month,
  });

  return nookipediaFetchWithRetry<string[]>(`/nh/bugs${q}`);
}

export async function fetchBugByName(
  bug: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaBugItem> {
  const safe = encodeURIComponent((bug ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  const res = await nookipediaFetchWithRetry<any>(`/nh/bugs/${safe}${q}`);

  // Sometimes returns [ { ... } ] — unwrap it
  if (Array.isArray(res)) {
    const first = res[0] ?? null;
    if (first && typeof first === "object") return first as NookipediaBugItem;
    throw new Error("Unexpected bug response shape (array).");
  }

  if (res && typeof res === "object") return res as NookipediaBugItem;

  throw new Error("Unexpected bug response shape.");
}

/**
 * ---------- Bug Index Cache ----------
 * Heavy list used for "Related (same location)" or other grouping without refetching lots of detail endpoints.
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let bugIndexCache: { fetchedAt: number; items: NookipediaBugItem[] } | null = null;
let bugIndexPromise: Promise<NookipediaBugItem[]> | null = null;

function isFresh(cache: typeof bugIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL bug objects.
 * Uses memory cache + single in-flight request.
 */
export async function fetchBugIndex(params?: { force?: boolean }): Promise<NookipediaBugItem[]> {
  const force = !!params?.force;

  if (!force && isFresh(bugIndexCache)) {
    return bugIndexCache!.items;
  }

  if (!force && bugIndexPromise) {
    return bugIndexPromise;
  }

  const run = async () => {
    try {
      const q = buildQuery({});
      const items = await nookipediaFetchWithRetry<NookipediaBugItem[]>(`/nh/bugs${q}`);
      bugIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      bugIndexPromise = null;
    }
  };

  bugIndexPromise = run();
  return bugIndexPromise;
}

/**
 * Warm the heavy index in the background (safe to call from Grid or Detail).
 */
export async function warmBugIndex(): Promise<NookipediaBugItem[] | null> {
  try {
    return await fetchBugIndex();
  } catch {
    return null;
  }
}
