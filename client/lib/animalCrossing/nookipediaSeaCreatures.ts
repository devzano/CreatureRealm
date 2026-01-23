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

export type NookipediaSeaCreatureItem = {
  url?: string;
  name?: string;
  number?: number;

  image_url?: string;
  render_url?: string;

  shadow_size?: string; // e.g. "Medium"
  shadow_movement?: string; // e.g. "Slow"
  rarity?: string;

  total_catch?: number;
  sell_nook?: number;

  tank_width?: number;
  tank_length?: number;

  catchphrases?: string[];

  north?: NookipediaHemisphereAvailability;
  south?: NookipediaHemisphereAvailability;

  [k: string]: any;
};

/**
 * Names list (fast-ish):
 * If Nookipedia returns full objects here (it often does), we still only
 * extract names in the grid layer.
 */
export async function fetchSeaCreatureNames(params?: { month?: string }): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    month: params?.month,
  });

  const res = await nookipediaFetchWithRetry<any>(`/nh/sea${q}`);

  // Some endpoints return full objects. Support both:
  if (Array.isArray(res)) {
    const names: string[] = [];
    for (const it of res) {
      const n = String(it?.name ?? "").trim();
      if (n) names.push(n);
    }
    // If it was already [string], this still works:
    if (names.length > 0) return names;
    return res.map((x: any) => String(x ?? "").trim()).filter(Boolean);
  }

  // If it’s something unexpected:
  throw new Error("Unexpected sea creature list response shape.");
}

export async function fetchSeaCreatureByName(
  seaCreature: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaSeaCreatureItem> {
  const safe = encodeURIComponent((seaCreature ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  const res = await nookipediaFetchWithRetry<any>(`/nh/sea/${safe}${q}`);

  // Sometimes returns [ { ... } ] — unwrap it
  if (Array.isArray(res)) {
    const first = res[0] ?? null;
    if (first && typeof first === "object") return first as NookipediaSeaCreatureItem;
    throw new Error("Unexpected sea creature response shape (array).");
  }

  if (res && typeof res === "object") return res as NookipediaSeaCreatureItem;

  throw new Error("Unexpected sea creature response shape.");
}

/**
 * ---------- Sea Creature Index Cache ----------
 * Heavy list used for grouping without refetching lots of detail endpoints.
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let seaIndexCache: { fetchedAt: number; items: NookipediaSeaCreatureItem[] } | null = null;
let seaIndexPromise: Promise<NookipediaSeaCreatureItem[]> | null = null;

function isFresh(cache: typeof seaIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

export async function fetchSeaCreatureIndex(params?: { force?: boolean }): Promise<NookipediaSeaCreatureItem[]> {
  const force = !!params?.force;

  if (!force && isFresh(seaIndexCache)) {
    return seaIndexCache!.items;
  }

  if (!force && seaIndexPromise) {
    return seaIndexPromise;
  }

  const run = async () => {
    try {
      const q = buildQuery({});
      const items = await nookipediaFetchWithRetry<NookipediaSeaCreatureItem[]>(`/nh/sea${q}`);
      seaIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      seaIndexPromise = null;
    }
  };

  seaIndexPromise = run();
  return seaIndexPromise;
}

export async function warmSeaCreatureIndex(): Promise<NookipediaSeaCreatureItem[] | null> {
  try {
    return await fetchSeaCreatureIndex();
  } catch {
    return null;
  }
}
