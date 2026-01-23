// lib/data/animalcrossing/nookipediaRecipes.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaRecipeAvailability = {
  from?: string;
  note?: string;
  [k: string]: any;
};

export type NookipediaRecipeBuy = {
  price?: number;
  currency?: string;
  [k: string]: any;
};

export type NookipediaRecipeMaterial = {
  name?: string;
  count?: number;
  [k: string]: any;
};

export type NookipediaRecipeItem = {
  name?: string;
  url?: string;
  image_url?: string;

  serial_id?: number;

  buy?: NookipediaRecipeBuy[];
  sell?: number;

  recipes_to_unlock?: number;

  availability?: NookipediaRecipeAvailability[];
  materials?: NookipediaRecipeMaterial[];

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
 * ---------- Recipes Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let recipesIndexCache: { fetchedAt: number; items: NookipediaRecipeItem[] } | null = null;
let recipesIndexPromise: Promise<NookipediaRecipeItem[]> | null = null;

function isFresh(cache: typeof recipesIndexCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

/**
 * Full index (heavy): returns ALL recipe objects.
 * No stable documented filters here, but keep the same structure as Photos anyway.
 */
export async function fetchRecipesIndex(opts?: { force?: boolean }): Promise<NookipediaRecipeItem[]> {
  const force = !!opts?.force;

  if (!force && isFresh(recipesIndexCache)) return recipesIndexCache!.items;
  if (!force && recipesIndexPromise) return recipesIndexPromise;

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaRecipeItem[]>(`/nh/recipes`);
      recipesIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      recipesIndexPromise = null;
    }
  };

  recipesIndexPromise = run();
  return recipesIndexPromise;
}

export async function warmRecipesIndex(): Promise<NookipediaRecipeItem[] | null> {
  try {
    return await fetchRecipesIndex();
  } catch {
    return null;
  }
}

/**
 * Fast path: get only names (excludedetails=true)
 */
export async function fetchRecipeNames(): Promise<string[]> {
  const q = buildQuery({ excludedetails: "true" });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/recipes${q}`);
  } catch (e: any) {
    // keep same semantics as Photos (no filters to fallback from, but still consistent)
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    if (retryable) {
      return await nookipediaFetchWithRetry<string[]>(`/nh/recipes${q}`);
    }

    throw e;
  }
}

/**
 * Rich path: get full detail for a single recipe item.
 * Supports thumbsize.
 *
 * NOTE: Nookipedia endpoint is /nh/recipes/{item}
 */
export async function fetchRecipeByName(
  item: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaRecipeItem> {
  const safe = encodeURIComponent((item ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaRecipeItem>(`/nh/recipes/${safe}${q}`);
}
