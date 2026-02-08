// lib/data/animalcrossing/nookipediaClothing.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaClothingItem = {
  name?: string;
  url?: string;
  category?: string;

  sell?: number;
  variation_total?: number;
  vill_equip?: boolean;
  seasonality?: string;
  version_added?: string;
  unlocked?: boolean;
  notes?: string;

  label_themes?: string[];
  styles?: string[];

  availability?: Array<{ from?: string; note?: string }>;
  buy?: Array<{ price?: number; currency?: string }>;

  variations?: Array<{
    variation?: string;
    image_url?: string;
    colors?: string[];
    [k: string]: any;
  }>;

  image_url?: string;
  render_url?: string;

  // API returns many extra keys
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

/* -------------------------------------------------------------------------- */
/*                             CLOTHING INDEX CACHE                            */
/* -------------------------------------------------------------------------- */

const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let clothingIndexCache: { fetchedAt: number; items: NookipediaClothingItem[] } | null = null;
let clothingIndexPromise: Promise<NookipediaClothingItem[]> | null = null;

/**
 * Full index (heavy): returns ALL clothing objects.
 * Supports optional filters via query params (not cached to avoid explosion).
 */
export async function fetchClothingIndex(params?: {
  category?: string;
  style?: string;
  label_theme?: string;
  color?: string[];
  force?: boolean;
}): Promise<NookipediaClothingItem[]> {
  const force = !!params?.force;

  const hasFilters =
    !!String(params?.category ?? "").trim() ||
    !!String(params?.style ?? "").trim() ||
    !!String(params?.label_theme ?? "").trim() ||
    (params?.color?.length ?? 0) > 0;

  if (!hasFilters && !force && isFresh(clothingIndexCache, INDEX_TTL_MS)) {
    return clothingIndexCache!.items;
  }

  if (!hasFilters && !force && clothingIndexPromise) {
    return clothingIndexPromise;
  }

  const q = buildQuery({
    category: params?.category,
    style: params?.style,
    label_theme: params?.label_theme,
    color: params?.color,
  });

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaClothingItem[]>(`/nh/clothing${q}`);
      if (!hasFilters) clothingIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      if (!hasFilters) clothingIndexPromise = null;
    }
  };

  if (!hasFilters) {
    clothingIndexPromise = run();
    return clothingIndexPromise;
  }

  return run();
}

export async function warmClothingIndex(): Promise<NookipediaClothingItem[] | null> {
  try {
    return await fetchClothingIndex();
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                CLOTHING NAMES                               */
/* -------------------------------------------------------------------------- */

export async function fetchClothingNames(params?: {
  category?: string;
  style?: string;
  label_theme?: string;
  color?: string[];
}): Promise<string[]> {
  const q = buildQuery({
    excludedetails: "true",
    category: params?.category,
    style: params?.style,
    label_theme: params?.label_theme,
    color: params?.color,
  });

  try {
    return await nookipediaFetchWithRetry<string[]>(`/nh/clothing${q}`);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const status = parseStatusFromErrorMessage(msg);
    const retryable = status != null ? isRetryableStatus(status) : false;

    const hasFilters =
      !!String(params?.category ?? "").trim() ||
      !!String(params?.style ?? "").trim() ||
      !!String(params?.label_theme ?? "").trim() ||
      (params?.color?.length ?? 0) > 0;

    if (retryable && hasFilters) {
      const q2 = buildQuery({ excludedetails: "true" });
      return await nookipediaFetchWithRetry<string[]>(`/nh/clothing${q2}`);
    }

    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 CLOTHING BY NAME                            */
/* -------------------------------------------------------------------------- */

export async function fetchClothingByName(
  clothing: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaClothingItem> {
  const safe = encodeURIComponent((clothing ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaClothingItem>(`/nh/clothing/${safe}${q}`);
}

/* -------------------------------------------------------------------------- */
/*                  ✅ RELATED LOOKUP (Category) FAST CACHE                    */
/* -------------------------------------------------------------------------- */

// Lazy-load AsyncStorage only in RN (won’t crash web builds if it’s missing)
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

export type NookipediaClothingLite = {
  name: string;
  category?: string | null;
  image_url?: string | null;
  render_url?: string | null;
};

type ClothingRelatedIndexPayload = {
  fetchedAt: number;
  byCategory: Record<string, NookipediaClothingLite[]>;
};

const RELATED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RELATED_STORAGE_KEY = "acnh:clothing:relatedIndex:v1";

let relatedIndexCache: ClothingRelatedIndexPayload | null = null;
let relatedIndexPromise: Promise<ClothingRelatedIndexPayload> | null = null;

function normKey(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function toLite(x: any): NookipediaClothingLite | null {
  const name = normKey(x?.name);
  if (!name) return null;

  return {
    name,
    category: normKey(x?.category),
    image_url: normKey(x?.image_url),
    render_url: normKey(x?.render_url),
  };
}

async function readRelatedIndexFromDisk(): Promise<ClothingRelatedIndexPayload | null> {
  const store = await getAsyncStorage();
  if (!store) return null;

  try {
    const raw = await store.getItem(RELATED_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as any;
    const fetchedAt = Number(parsed?.fetchedAt ?? 0);
    const byCategory = parsed?.byCategory && typeof parsed.byCategory === "object" ? parsed.byCategory : null;

    if (!Number.isFinite(fetchedAt) || !byCategory) return null;
    return { fetchedAt, byCategory } as ClothingRelatedIndexPayload;
  } catch {
    return null;
  }
}

async function writeRelatedIndexToDisk(payload: ClothingRelatedIndexPayload): Promise<void> {
  const store = await getAsyncStorage();
  if (!store) return;

  try {
    await store.setItem(RELATED_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function buildRelatedIndex(items: NookipediaClothingItem[]): ClothingRelatedIndexPayload {
  const byCategory: Record<string, NookipediaClothingLite[]> = {};

  for (const it of Array.isArray(items) ? items : []) {
    const lite = toLite(it);
    if (!lite) continue;

    const cat = lite.category ? String(lite.category) : null;
    if (!cat) continue;

    (byCategory[cat] ||= []).push(lite);
  }

  for (const k of Object.keys(byCategory)) {
    byCategory[k].sort((a, b) => a.name.localeCompare(b.name));
  }

  return { fetchedAt: Date.now(), byCategory };
}

/**
 * Ensures the related index exists (category -> lite items).
 * Builds once from the heavy index then persists to disk.
 */
export async function ensureClothingRelatedIndex(opts?: { force?: boolean }): Promise<ClothingRelatedIndexPayload> {
  const force = !!opts?.force;

  if (!force && isFresh(relatedIndexCache, RELATED_TTL_MS)) {
    return relatedIndexCache!;
  }

  if (!force) {
    const disk = await readRelatedIndexFromDisk();
    if (disk && isFresh(disk, RELATED_TTL_MS)) {
      relatedIndexCache = disk;
      return disk;
    }
  }

  if (!force && relatedIndexPromise) return relatedIndexPromise;

  const run = async () => {
    try {
      const items = await fetchClothingIndex({ force: force ? true : false });
      const built = buildRelatedIndex(items);

      relatedIndexCache = built;
      writeRelatedIndexToDisk(built).catch(() => {});
      return built;
    } finally {
      relatedIndexPromise = null;
    }
  };

  relatedIndexPromise = run();
  return relatedIndexPromise;
}

/**
 * Fast related lookup by category using the cached related index.
 */
export async function fetchRelatedClothingLiteByCategory(params: {
  category: string;
  excludeName?: string | null;
  limit?: number;
}): Promise<NookipediaClothingLite[]> {
  const cat = normKey(params.category);
  if (!cat) return [];

  const exclude = normKey(params.excludeName)?.toLowerCase() ?? null;
  const limit = Math.max(1, Math.min(60, Number(params.limit ?? 24)));

  const idx = await ensureClothingRelatedIndex();
  const pool = Array.isArray(idx.byCategory?.[cat]) ? idx.byCategory[cat] : [];

  const filtered = pool.filter((x) => {
    const n = String(x?.name ?? "").trim();
    if (!n) return false;
    if (exclude && n.toLowerCase() === exclude) return false;
    return true;
  });

  return filtered.slice(0, limit);
}

/**
 * Optional: warm related index in the background.
 */
export async function warmClothingRelatedIndex(): Promise<boolean> {
  try {
    await ensureClothingRelatedIndex();
    return true;
  } catch {
    return false;
  }
}
