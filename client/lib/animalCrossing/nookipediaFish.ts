// lib/data/animalcrossing/nookipediaFish.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaAvailabilityRange = {
  months?: string;
  time?: string;
  [k: string]: any;
};

export type NookipediaHemisphereAvailability = {
  availability_array?: NookipediaAvailabilityRange[];
  times_by_month?: Record<string, string>; // keys "1"..."12"
  months?: string; // "All year" or "Mar – Jun; Sep – Nov"
  months_array?: number[];
  [k: string]: any;
};

export type NookipediaFishItem = {
  url?: string;
  name?: string;
  number?: number;

  image_url?: string;
  render_url?: string;

  location?: string;
  shadow_size?: string;
  rarity?: string;

  total_catch?: number;
  sell_nook?: number;
  sell_cj?: number;

  tank_width?: number;
  tank_length?: number;

  catchphrases?: string[];

  // Availability blocks
  north?: NookipediaHemisphereAvailability;
  south?: NookipediaHemisphereAvailability;

  [k: string]: any;
};

export async function fetchFishNames(params?: { month?: string }): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    month: params?.month,
  });

  return nookipediaFetchWithRetry<string[]>(`/nh/fish${q}`);
}

export async function fetchFishByName(
  fish: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaFishItem> {
  const safe = encodeURIComponent((fish ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  const res = await nookipediaFetchWithRetry<any>(`/nh/fish/${safe}${q}`);

  if (Array.isArray(res)) {
    const first = res[0] ?? null;
    if (first && typeof first === "object") return first as NookipediaFishItem;
    throw new Error("Unexpected fish response shape (array).");
  }

  if (res && typeof res === "object") return res as NookipediaFishItem;

  throw new Error("Unexpected fish response shape.");
}

/**
 * ---------- Fish Index Cache ----------
 * Heavy list used for "Related (same location)" without refetching lots of individual fish.
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let fishIndexCache: { fetchedAt: number; items: NookipediaFishItem[] } | null = null;
let fishIndexPromise: Promise<NookipediaFishItem[]> | null = null;

function isFresh(cache: typeof fishIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL fish objects.
 * Uses memory cache + single in-flight request.
 */
export async function fetchFishIndex(params?: { force?: boolean }): Promise<NookipediaFishItem[]> {
  const force = !!params?.force;

  if (!force && isFresh(fishIndexCache)) {
    return fishIndexCache!.items;
  }

  if (!force && fishIndexPromise) {
    return fishIndexPromise;
  }

  const run = async () => {
    try {
      const q = buildQuery({});
      const items = await nookipediaFetchWithRetry<NookipediaFishItem[]>(`/nh/fish${q}`);
      fishIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      fishIndexPromise = null;
    }
  };

  fishIndexPromise = run();
  return fishIndexPromise;
}

/**
 * Warm the heavy index in the background (safe to call from Grid or Detail).
 */
export async function warmFishIndex(): Promise<NookipediaFishItem[] | null> {
  try {
    return await fetchFishIndex();
  } catch {
    return null;
  }
}
