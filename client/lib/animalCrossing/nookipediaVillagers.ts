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

  [k: string]: any;
};

const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type CacheEntry = { fetchedAt: number; items: NookipediaVillager[] };

const villagersCacheByGame: Record<string, CacheEntry | undefined> = {};
const villagersPromiseByGame: Record<string, Promise<NookipediaVillager[]> | undefined> = {};

function isFresh(cache?: CacheEntry) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

function normalizeGame(game?: string) {
  const g = String(game ?? "").trim().toLowerCase();
  return g || "nh";
}

function unwrapVillagerResponse(res: any): NookipediaVillager | null {
  if (!res) return null;
  if (Array.isArray(res)) return (res[0] as NookipediaVillager) ?? null;
  if (typeof res === "object") return res as NookipediaVillager;
  return null;
}

function pickNhdetailsFlag(game: string, force?: boolean) {
  if (force) return "true";
  return game === "nh" ? "true" : undefined;
}

function uniqStrings(list: any[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function looksLikeVillagerIndexRow(v: any): boolean {
  if (!v || typeof v !== "object") return false;

  const name = typeof v.name === "string" ? v.name.trim() : "";
  if (!name) return false;

  const hasSpecies = typeof v.species === "string" && v.species.trim().length > 0;
  const hasPersonality = typeof v.personality === "string" && v.personality.trim().length > 0;
  const hasId = typeof v.id === "string" && v.id.trim().length > 0;

  return hasSpecies || hasPersonality || hasId;
}

export async function fetchVillagersIndex(opts?: {
  force?: boolean;
  game?: string;
}): Promise<NookipediaVillager[]> {
  const force = !!opts?.force;
  const game = normalizeGame(opts?.game);

  const cache = villagersCacheByGame[game];
  if (!force && isFresh(cache)) return cache!.items;

  const inflight = villagersPromiseByGame[game];
  if (!force && inflight) return inflight;

  const run = async () => {
    try {
      const q = buildQuery({ game });
      const items = await nookipediaFetchWithRetry<any>(`/villagers${q}`);

      const arrRaw = Array.isArray(items) ? (items as any[]) : [];
      const arr = arrRaw.filter(looksLikeVillagerIndexRow) as NookipediaVillager[];

      villagersCacheByGame[game] = { fetchedAt: Date.now(), items: arr };
      return arr;
    } finally {
      villagersPromiseByGame[game] = undefined;
    }
  };

  villagersPromiseByGame[game] = run();
  return villagersPromiseByGame[game]!;
}

export async function warmVillagersIndex(): Promise<NookipediaVillager[] | null> {
  try {
    return await fetchVillagersIndex({ game: "nh" });
  } catch {
    return null;
  }
}

export async function fetchVillagerNames(opts?: { force?: boolean; game?: string }): Promise<string[]> {
  const game = normalizeGame(opts?.game);
  const items = await fetchVillagersIndex({ force: opts?.force, game });
  return uniqStrings(items.map((x) => x?.name));
}

/**
 * Species list pulled from the index endpoint (fast, complete, no detail fetch needed).
 */
export async function fetchVillagerSpecies(opts?: { force?: boolean; game?: string }): Promise<string[]> {
  const game = normalizeGame(opts?.game);
  const items = await fetchVillagersIndex({ force: opts?.force, game });
  const species = uniqStrings(items.map((x) => x?.species));
  return species.sort((a, b) => a.localeCompare(b));
}

/**
 * Map name -> species pulled from the index endpoint.
 * Useful for filtering without waiting for detail fetches.
 */
export async function fetchVillagerSpeciesByName(opts?: {
  force?: boolean;
  game?: string;
}): Promise<Record<string, string>> {
  const game = normalizeGame(opts?.game);
  const items = await fetchVillagersIndex({ force: opts?.force, game });

  const out: Record<string, string> = {};
  for (const v of items) {
    const name = String(v?.name ?? "").trim();
    const sp = String(v?.species ?? "").trim();
    if (!name || !sp) continue;
    out[name] = sp;
  }
  return out;
}

export async function fetchVillagerByName(
  villagerName: string,
  opts?: { thumbsize?: number; game?: string; nhdetails?: boolean }
): Promise<NookipediaVillager | null> {
  const name = String(villagerName ?? "").trim();
  if (!name) return null;

  const game = normalizeGame(opts?.game);
  const nhdetails = pickNhdetailsFlag(game, opts?.nhdetails === true);

  const q = buildQuery({
    game,
    nhdetails,
    name,
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  const res = await nookipediaFetchWithRetry<any>(`/villagers${q}`);
  return unwrapVillagerResponse(res);
}
