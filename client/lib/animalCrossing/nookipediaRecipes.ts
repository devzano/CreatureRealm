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

function isFresh(cache: { fetchedAt: number } | null, ttlMs: number) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < ttlMs;
}

/**
 * ---------- Recipes Index Cache ----------
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let recipesIndexCache: { fetchedAt: number; items: NookipediaRecipeItem[] } | null = null;
let recipesIndexPromise: Promise<NookipediaRecipeItem[]> | null = null;

/**
 * Full index (heavy): returns ALL recipe objects.
 */
export async function fetchRecipesIndex(opts?: { force?: boolean }): Promise<NookipediaRecipeItem[]> {
  const force = !!opts?.force;

  if (!force && isFresh(recipesIndexCache, INDEX_TTL_MS)) return recipesIndexCache!.items;
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
 * ---------- Recipe Names Cache (Disk + Memory) ----------
 * This is the biggest “feel fast” win for the grids.
 */
const NAMES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NAMES_STORAGE_KEY = "acnh:recipes:names:v1";

let recipeNamesCache: { fetchedAt: number; names: string[] } | null = null;
let recipeNamesPromise: Promise<string[]> | null = null;

type AsyncStorageLike = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};

let asyncStorageMod: AsyncStorageLike | null | "unavailable" = null;

async function getAsyncStorage(): Promise<AsyncStorageLike | null> {
  if (asyncStorageMod === "unavailable") return null;
  if (asyncStorageMod) return asyncStorageMod;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require("@react-native-async-storage/async-storage");
    const inst = (m?.default ?? m) as AsyncStorageLike;

    if (typeof inst?.getItem === "function" && typeof inst?.setItem === "function") {
      asyncStorageMod = inst;
      return inst;
    }
  } catch {}

  asyncStorageMod = "unavailable";
  return null;
}

async function readNamesFromDisk(): Promise<{ fetchedAt: number; names: string[] } | null> {
  const store = await getAsyncStorage();
  if (!store) return null;

  try {
    const raw = await store.getItem(NAMES_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as any;
    const fetchedAt = Number(parsed?.fetchedAt ?? 0);
    const names = Array.isArray(parsed?.names) ? parsed.names.map((x: any) => String(x)) : [];

    if (!Number.isFinite(fetchedAt) || names.length === 0) return null;
    return { fetchedAt, names };
  } catch {
    return null;
  }
}

async function writeNamesToDisk(payload: { fetchedAt: number; names: string[] }): Promise<void> {
  const store = await getAsyncStorage();
  if (!store) return;

  try {
    await store.setItem(NAMES_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

/**
 * Fast path: get only names (excludedetails=true)
 * IMPORTANT: don’t double-retry here — nookipediaFetchWithRetry already does that.
 */
export async function fetchRecipeNames(): Promise<string[]> {
  // memory cache
  if (isFresh(recipeNamesCache, NAMES_TTL_MS)) return recipeNamesCache!.names;

  // disk cache
  const disk = await readNamesFromDisk();
  if (disk && isFresh(disk, NAMES_TTL_MS)) {
    recipeNamesCache = disk;
    return disk.names;
  }

  // single in-flight promise
  if (recipeNamesPromise) return recipeNamesPromise;

  const run = async () => {
    try {
      const q = buildQuery({ excludedetails: "true" });
      const names = await nookipediaFetchWithRetry<string[]>(`/nh/recipes${q}`);

      const payload = { fetchedAt: Date.now(), names };
      recipeNamesCache = payload;
      writeNamesToDisk(payload).catch(() => {});
      return names;
    } catch (e: any) {
      // If retryable + we have a stale cache, prefer stale instead of hanging UX
      const msg = String(e?.message ?? "");
      const status = parseStatusFromErrorMessage(msg);
      const retryable = status != null ? isRetryableStatus(status) : false;

      if (retryable) {
        if (recipeNamesCache?.names?.length) return recipeNamesCache.names;

        const disk2 = await readNamesFromDisk();
        if (disk2?.names?.length) {
          recipeNamesCache = disk2;
          return disk2.names;
        }
      }

      throw e;
    } finally {
      recipeNamesPromise = null;
    }
  };

  recipeNamesPromise = run();
  return recipeNamesPromise;
}

/**
 * Rich path: get full detail for a single recipe item.
 * Supports thumbsize.
 *
 * NOTE: endpoint is /nh/recipes/{item}
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
