// lib/animalCrossing/nookipediaInterior.ts
import { nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaInteriorIndexItem = {
  name?: string;
  url?: string;
  image_url?: string;

  category?: string; // Wallpaper, Flooring, Rug, etc.
  item_series?: string;
  item_set?: string;

  themes?: string[];
  hha_category?: string;
  hha_base?: number;
  tag?: string;

  sell?: number;
  version_added?: string;
  unlocked?: boolean;
  notes?: string;

  grid_width?: number;
  grid_length?: number;

  colors?: string[];

  availability?: { from?: string; note?: string }[];
  buy?: { price?: number; currency?: string }[];

  // API returns extra keys
  [k: string]: any;
};

export type NookipediaInteriorDetailItem = NookipediaInteriorIndexItem;

/**
 * ---------- Interior Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let interiorCache: { fetchedAt: number; items: NookipediaInteriorIndexItem[] } | null = null;
let interiorPromise: Promise<NookipediaInteriorIndexItem[]> | null = null;

function isFresh(cache: typeof interiorCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

export async function fetchInteriorIndex(opts?: { force?: boolean }): Promise<NookipediaInteriorIndexItem[]> {
  const force = !!opts?.force;

  if (!force && isFresh(interiorCache)) return interiorCache!.items;
  if (!force && interiorPromise) return interiorPromise;

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaInteriorIndexItem[]>(`/nh/interior`);
      interiorCache = { fetchedAt: Date.now(), items: Array.isArray(items) ? items : [] };
      return interiorCache.items;
    } finally {
      interiorPromise = null;
    }
  };

  interiorPromise = run();
  return interiorPromise;
}

export async function warmInteriorIndex(): Promise<NookipediaInteriorIndexItem[] | null> {
  try {
    return await fetchInteriorIndex();
  } catch {
    return null;
  }
}

export async function fetchInteriorNames(): Promise<string[]> {
  const items = await fetchInteriorIndex();
  return items
    .map((x) => String(x?.name ?? "").trim())
    .filter((s) => !!s);
}

/**
 * Detail: /nh/interior/{item}
 * - item should be URL-encoded (spaces, apostrophes, etc.)
 * - supports optional thumbsize via query
 */
export async function fetchInteriorByName(
  itemName: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaInteriorDetailItem | null> {
  const name = String(itemName ?? "").trim();
  if (!name) return null;

  const encoded = encodeURIComponent(name);
  const qs =
    opts?.thumbsize && Number.isFinite(opts.thumbsize)
      ? `?thumbsize=${encodeURIComponent(String(opts.thumbsize))}`
      : "";

  return await nookipediaFetchWithRetry<NookipediaInteriorDetailItem>(`/nh/interior/${encoded}${qs}`);
}
