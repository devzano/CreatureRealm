// lib/animalCrossing/nookipediaVillagers.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaVillager = {
  url?: string;
  name?: string;
  alt_name?: string;

  title_color?: string;
  text_color?: string;

  id?: string;
  image_url?: string;

  species?: string;
  personality?: string;
  gender?: string;

  birthday_month?: string;
  birthday_day?: string;
  sign?: string;

  quote?: string;
  phrase?: string;
  prev_phrases?: string[];

  clothing?: string;
  islander?: boolean;

  debut?: string;
  appearances?: string[];

  nh_details?: {
    image_url?: string;
    photo_url?: string;
    icon_url?: string;

    quote?: string;
    "sub-personality"?: string;
    catchphrase?: string;

    clothing?: string;
    clothing_variation?: string;

    fav_styles?: string[];
    fav_colors?: string[];

    hobby?: string;

    house_interior_url?: string;
    house_exterior_url?: string;

    house_wallpaper?: string;
    house_flooring?: string;

    house_music?: string;
    house_music_note?: string;

    umbrella?: string;

    [k: string]: any;
  };

  // API returns extra keys
  [k: string]: any;
};

/**
 * ---------- Villagers Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let villagersCache: { fetchedAt: number; items: NookipediaVillager[] } | null = null;
let villagersPromise: Promise<NookipediaVillager[]> | null = null;

function isFresh(cache: typeof villagersCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

export async function fetchVillagersIndex(opts?: { force?: boolean }): Promise<NookipediaVillager[]> {
  const force = !!opts?.force;

  if (!force && isFresh(villagersCache)) return villagersCache!.items;
  if (!force && villagersPromise) return villagersPromise;

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaVillager[]>(`/villagers`);
      villagersCache = { fetchedAt: Date.now(), items: Array.isArray(items) ? items : [] };
      return villagersCache.items;
    } finally {
      villagersPromise = null;
    }
  };

  villagersPromise = run();
  return villagersPromise;
}

export async function warmVillagersIndex(): Promise<NookipediaVillager[] | null> {
  try {
    return await fetchVillagersIndex();
  } catch {
    return null;
  }
}

/**
 * Names:
 * - Try fast path excludedetails=true if supported
 * - Fallback to full index
 */
export async function fetchVillagerNames(): Promise<string[]> {
  // fast path (if API supports it)
  try {
    const q = buildQuery({ excludedetails: "true" });
    const names = await nookipediaFetchWithRetry<string[]>(`/villagers${q}`);
    if (Array.isArray(names) && names.length) {
      return names.map((s) => String(s ?? "").trim()).filter((s) => !!s);
    }
  } catch {
    // ignore and fallback
  }

  const items = await fetchVillagersIndex();
  return items
    .map((x) => String(x?.name ?? "").trim())
    .filter((s) => !!s);
}

/**
 * Detail:
 * - Try /villagers/{name}
 * - Fallback /villagers?name={name}
 * - Supports optional thumbsize query (keeps parity with your other modules)
 */
export async function fetchVillagerByName(
  villagerName: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaVillager | null> {
  const name = String(villagerName ?? "").trim();
  if (!name) return null;

  const qs = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  const encoded = encodeURIComponent(name);

  // Pattern A: /villagers/{name}
  try {
    return await nookipediaFetchWithRetry<NookipediaVillager>(`/villagers/${encoded}${qs}`);
  } catch {
    // Pattern B: /villagers?name={name}
    const q2 = buildQuery({
      name,
      thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
    });

    // Some APIs return an array for query lookups — handle both.
    const res = await nookipediaFetchWithRetry<any>(`/villagers${q2}`);
    if (Array.isArray(res)) return (res[0] as NookipediaVillager) ?? null;
    return (res as NookipediaVillager) ?? null;
  }
}
