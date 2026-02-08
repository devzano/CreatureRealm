// lib/data/animalcrossing/nookipediaFurniture.ts
import { buildQuery, NookipediaErrorPayload, nookipediaFetchRaw, sleep } from "./nookipedia";

export type NookipediaFurnitureCategory =
  | "Housewares"
  | "Miscellaneous"
  | "Wall-mounted"
  | "Ceiling decor";

export type NookipediaFurnitureColor =
  | "Aqua"
  | "Beige"
  | "Black"
  | "Blue"
  | "Brown"
  | "Colorful"
  | "Gray"
  | "Green"
  | "Orange"
  | "Pink"
  | "Purple"
  | "Red"
  | "White"
  | "Yellow";

export type FetchFurnitureNamesParams = {
  category?: NookipediaFurnitureCategory | string;
  color?: NookipediaFurnitureColor[];
};

export type NookipediaFurnitureItem = {
  name?: string;
  category?: string;
  image_url?: string;
  image_url_square?: string;
  variations?: any[];
  [k: string]: any;
};

export function normalizeFurnitureCategory(input?: string): string | undefined {
  if (!input) return undefined;

  const raw = String(input).trim();
  if (!raw) return undefined;

  const lower = raw.toLowerCase();
  if (lower === "housewares") return "Housewares";
  if (lower === "miscellaneous") return "Miscellaneous";
  if (lower === "wall-mounted" || lower === "wall mounted") return "Wall-mounted";
  if (lower === "ceiling decor" || lower === "ceiling-decor") return "Ceiling decor";

  return raw;
}

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

async function nookipediaFetch<T>(path: string): Promise<T> {
  const res = await nookipediaFetchRaw(path);

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    let parsed: NookipediaErrorPayload | null = null;
    try {
      parsed = body ? (JSON.parse(body) as any) : null;
    } catch {}

    const detail = parsed?.details ? ` ${parsed.details}` : "";
    const title = parsed?.title ? `${parsed.title}.` : "";

    throw new Error(
      `Nookipedia request failed (${res.status}): ${title}${detail || body || res.statusText}`
    );
  }

  return (await res.json()) as T;
}

export async function nookipediaFetchWithRetry<T>(
  path: string,
  opts?: { retries?: number; retryDelayMs?: number }
): Promise<T> {
  const retries = Math.max(0, opts?.retries ?? 4);
  const delay = Math.max(0, opts?.retryDelayMs ?? 450);

  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await nookipediaFetch<T>(path);
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message ?? "");
      const status = parseStatusFromErrorMessage(msg);
      const retryable = status != null ? isRetryableStatus(status) : false;

      if (!retryable || attempt === retries) break;

      await sleep(delay * (attempt + 1));
    }
  }

  throw lastErr ?? new Error("Nookipedia request failed.");
}

function isFresh(cache: { fetchedAt: number } | null, ttlMs: number) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < ttlMs;
}

const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let furnitureIndexCache:
  | { fetchedAt: number; items: NookipediaFurnitureItem[] }
  | null = null;

let furnitureIndexPromise: Promise<NookipediaFurnitureItem[]> | null = null;

export async function fetchFurnitureIndex(
  params?: {
    category?: NookipediaFurnitureCategory | string;
    color?: NookipediaFurnitureColor[];
    force?: boolean;
  }
): Promise<NookipediaFurnitureItem[]> {
  const force = !!params?.force;

  const hasFilters =
    !!normalizeFurnitureCategory(params?.category as any) ||
    (params?.color?.length ?? 0) > 0;

  if (!hasFilters && !force && isFresh(furnitureIndexCache, INDEX_TTL_MS)) {
    return furnitureIndexCache!.items;
  }

  if (!hasFilters && !force && furnitureIndexPromise) {
    return furnitureIndexPromise;
  }

  const category = normalizeFurnitureCategory(params?.category as any);

  const q = buildQuery({
    category,
    color: params?.color,
  });

  const run = async () => {
    try {
      try {
        const items = await nookipediaFetchWithRetry<NookipediaFurnitureItem[]>(
          `/nh/furniture${q}`
        );

        if (!hasFilters) {
          furnitureIndexCache = { fetchedAt: Date.now(), items };
        }

        return items;
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        const status = parseStatusFromErrorMessage(msg);
        const retryable = status != null ? isRetryableStatus(status) : false;

        if (retryable && hasFilters) {
          const q2 = buildQuery({});
          const items2 = await nookipediaFetchWithRetry<NookipediaFurnitureItem[]>(
            `/nh/furniture${q2}`
          );
          furnitureIndexCache = { fetchedAt: Date.now(), items: items2 };
          return items2;
        }

        throw e;
      }
    } finally {
      if (!hasFilters) furnitureIndexPromise = null;
    }
  };

  if (!hasFilters) {
    furnitureIndexPromise = run();
    return furnitureIndexPromise;
  }

  return run();
}

export async function warmFurnitureIndex(): Promise<NookipediaFurnitureItem[] | null> {
  try {
    return await fetchFurnitureIndex();
  } catch {
    return null;
  }
}

const NAMES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NAMES_STORAGE_KEY = "acnh:furniture:names:v1";

let furnitureNamesCache: { fetchedAt: number; names: string[] } | null = null;
let furnitureNamesPromise: Promise<string[]> | null = null;

type AsyncStorageLike = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};

let asyncStorageMod: AsyncStorageLike | null | "unavailable" = null;

function hasFiltersForNames(params?: FetchFurnitureNamesParams) {
  const category = normalizeFurnitureCategory(params?.category as any);
  const hasColor = (params?.color?.length ?? 0) > 0;
  return !!category || hasColor;
}

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

export async function fetchFurnitureNames(params?: FetchFurnitureNamesParams): Promise<string[]> {
  const category = normalizeFurnitureCategory(params?.category as any);

  const q = buildQuery({
    excludedetails: "true",
    category,
    color: params?.color,
  });

  const filtered = hasFiltersForNames(params);

  if (!filtered) {
    // 1) memory cache
    if (isFresh(furnitureNamesCache, NAMES_TTL_MS)) {
      return furnitureNamesCache!.names;
    }

    const disk = await readNamesFromDisk();
    if (disk && isFresh(disk, NAMES_TTL_MS)) {
      furnitureNamesCache = disk;
      return disk.names;
    }

    if (furnitureNamesPromise) return furnitureNamesPromise;
  }

  const run = async () => {
    try {
      const names = await nookipediaFetchWithRetry<string[]>(`/nh/furniture${q}`);

      if (!filtered) {
        const payload = { fetchedAt: Date.now(), names };
        furnitureNamesCache = payload;
        writeNamesToDisk(payload).catch(() => {});
      }

      return names;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const status = parseStatusFromErrorMessage(msg);
      const retryable = status != null ? isRetryableStatus(status) : false;

      if (retryable && filtered) {
        const q2 = buildQuery({ excludedetails: "true" });
        const names2 = await nookipediaFetchWithRetry<string[]>(`/nh/furniture${q2}`);

        const payload = { fetchedAt: Date.now(), names: names2 };
        furnitureNamesCache = payload;
        writeNamesToDisk(payload).catch(() => {});

        return names2;
      }

      if (!filtered) {
        if (furnitureNamesCache?.names?.length) return furnitureNamesCache.names;

        const disk = await readNamesFromDisk();
        if (disk?.names?.length) {
          furnitureNamesCache = disk;
          return disk.names;
        }
      }

      throw e;
    } finally {
      if (!filtered) furnitureNamesPromise = null;
    }
  };

  if (!filtered) {
    furnitureNamesPromise = run();
    return furnitureNamesPromise;
  }

  return run();
}

export async function fetchFurnitureByName(
  furniture: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaFurnitureItem> {
  const safe = encodeURIComponent((furniture ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaFurnitureItem>(`/nh/furniture/${safe}${q}`);
}

export type NookipediaFurnitureLite = {
  name: string;
  category?: string | null;
  image_url?: string | null;
  image_url_square?: string | null;
  item_set?: string | null;
  item_series?: string | null;
};

type RelatedIndexPayload = {
  fetchedAt: number;
  bySet: Record<string, NookipediaFurnitureLite[]>;
  bySeries: Record<string, NookipediaFurnitureLite[]>;
};

const RELATED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RELATED_STORAGE_KEY = "acnh:furniture:relatedIndex:v1";

let relatedIndexCache: RelatedIndexPayload | null = null;
let relatedIndexPromise: Promise<RelatedIndexPayload> | null = null;

function relNormKey(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function toLite(x: any): NookipediaFurnitureLite | null {
  const name = relNormKey(x?.name);
  if (!name) return null;

  return {
    name,
    category: relNormKey(x?.category),
    image_url: relNormKey(x?.image_url ?? x?.image),
    image_url_square: relNormKey(x?.image_url_square),
    item_set: relNormKey(x?.item_set),
    item_series: relNormKey(x?.item_series),
  };
}

async function readRelatedIndexFromDisk(): Promise<RelatedIndexPayload | null> {
  const store = await getAsyncStorage();
  if (!store) return null;

  try {
    const raw = await store.getItem(RELATED_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as any;
    const fetchedAt = Number(parsed?.fetchedAt ?? 0);

    const bySet = parsed?.bySet && typeof parsed.bySet === "object" ? parsed.bySet : null;
    const bySeries = parsed?.bySeries && typeof parsed.bySeries === "object" ? parsed.bySeries : null;

    if (!Number.isFinite(fetchedAt) || !bySet || !bySeries) return null;

    return { fetchedAt, bySet, bySeries } as RelatedIndexPayload;
  } catch {
    return null;
  }
}

async function writeRelatedIndexToDisk(payload: RelatedIndexPayload): Promise<void> {
  const store = await getAsyncStorage();
  if (!store) return;

  try {
    await store.setItem(RELATED_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function buildRelatedIndex(items: NookipediaFurnitureItem[]): RelatedIndexPayload {
  const bySet: Record<string, NookipediaFurnitureLite[]> = {};
  const bySeries: Record<string, NookipediaFurnitureLite[]> = {};

  for (const it of Array.isArray(items) ? items : []) {
    const lite = toLite(it);
    if (!lite) continue;

    const set = lite.item_set ? String(lite.item_set) : null;
    const series = lite.item_series ? String(lite.item_series) : null;

    if (set) (bySet[set] ||= []).push(lite);
    if (series) (bySeries[series] ||= []).push(lite);
  }

  // stable ordering
  for (const k of Object.keys(bySet)) bySet[k].sort((a, b) => a.name.localeCompare(b.name));
  for (const k of Object.keys(bySeries)) bySeries[k].sort((a, b) => a.name.localeCompare(b.name));

  return { fetchedAt: Date.now(), bySet, bySeries };
}

export async function ensureFurnitureRelatedIndex(opts?: { force?: boolean }): Promise<RelatedIndexPayload> {
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
      const items = await fetchFurnitureIndex({ force: force ? true : false });
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

export async function fetchRelatedFurnitureLite(params: {
  item_set?: string | null;
  item_series?: string | null;
  excludeName?: string | null;
  limit?: number;
}): Promise<NookipediaFurnitureLite[]> {
  const set = relNormKey(params.item_set);
  const series = relNormKey(params.item_series);
  const exclude = relNormKey(params.excludeName)?.toLowerCase() ?? null;
  const limit = Math.max(1, Math.min(60, Number(params.limit ?? 24)));

  if (!set && !series) return [];

  const idx = await ensureFurnitureRelatedIndex();

  // Prefer set if provided, else series
  const pool = set
    ? (Array.isArray(idx.bySet?.[set]) ? idx.bySet[set] : [])
    : (Array.isArray(idx.bySeries?.[series!]) ? idx.bySeries[series!] : []);

  const filtered = pool.filter((x) => {
    const n = String(x?.name ?? "").trim();
    if (!n) return false;
    if (exclude && n.toLowerCase() === exclude) return false;
    return true;
  });

  return filtered.slice(0, limit);
}

export async function warmFurnitureRelatedIndex(): Promise<boolean> {
  try {
    await ensureFurnitureRelatedIndex();
    return true;
  } catch {
    return false;
  }
}
