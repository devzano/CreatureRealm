// lib/data/animalcrossing/nookipediaFossils.ts
import { buildQuery, nookipediaFetchWithRetry } from "./nookipedia";

/**
 * Nookipedia Fossils (NH) endpoints:
 * - /nh/fossils/individuals
 * - /nh/fossils/individuals/{fossil}
 *
 * - /nh/fossils/groups
 * - /nh/fossils/groups/{fossil_group}
 *
 * - /nh/fossils/all
 * - /nh/fossils/all/{fossil}
 *
 * This file includes:
 * Individual fossils (grid + detail)
 * Fossil groups + group detail (with fossils list)
 * "All" search (group + matched + fossils)
 * Names helpers for individuals + groups
 * In-memory caches (TTL + single in-flight Promise) for individuals/groups/all
 */

// ---------- Types ----------

export type NookipediaFossilIndividualItem = {
  name?: string;
  url?: string;

  image_url?: string;
  fossil_group?: string;

  interactable?: boolean;
  sell?: number;
  hha_base?: number;

  width?: number;
  length?: number;

  colors?: string[];

  // API returns extra keys
  [k: string]: any;
};

export type NookipediaFossilGroupItem = {
  name?: string;
  url?: string;
  room?: number;
  description?: string;

  // API returns extra keys
  [k: string]: any;
};

export type NookipediaFossilGroupDetailItem = NookipediaFossilGroupItem & {
  fossils?: Array<{
    name?: string;
    url?: string;
    image_url?: string;

    interactable?: boolean;
    sell?: number;
    hha_base?: number;

    width?: number;
    length?: number;

    colors?: string[];

    [k: string]: any;
  }>;
};

export type NookipediaFossilAllMatched = {
  type?: "individual" | "group" | string;
  name?: string;
  [k: string]: any;
};

export type NookipediaFossilAllResult = {
  name?: string; // group name
  url?: string;
  room?: number;
  description?: string;

  matched?: NookipediaFossilAllMatched | null;

  fossils?: Array<{
    name?: string;
    url?: string;
    image_url?: string;

    interactable?: boolean;
    sell?: number;
    hha_base?: number;

    width?: number;
    length?: number;

    colors?: string[];

    [k: string]: any;
  }>;

  [k: string]: any;
};

// ---------- Shared Cache Helpers ----------

const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isFresh(cache: { fetchedAt: number } | null) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

function cleanNames(list: any[]): string[] {
  return (Array.isArray(list) ? list : [])
    .map((x) => String(x ?? "").trim())
    .filter((s) => !!s);
}

// ---------- Individuals ----------

let fossilIndividualsIndexCache:
  | { fetchedAt: number; items: NookipediaFossilIndividualItem[] }
  | null = null;

let fossilIndividualsIndexPromise: Promise<NookipediaFossilIndividualItem[]> | null = null;

/**
 * Full index: ALL fossil individuals (array of objects).
 * Cached + single in-flight Promise.
 */
export async function fetchFossilIndividualsIndex(params?: {
  force?: boolean;
}): Promise<NookipediaFossilIndividualItem[]> {
  const force = !!params?.force;

  if (!force && isFresh(fossilIndividualsIndexCache)) {
    return fossilIndividualsIndexCache!.items;
  }

  if (!force && fossilIndividualsIndexPromise) {
    return fossilIndividualsIndexPromise;
  }

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaFossilIndividualItem[]>(
        `/nh/fossils/individuals`
      );
      fossilIndividualsIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      fossilIndividualsIndexPromise = null;
    }
  };

  fossilIndividualsIndexPromise = run();
  return fossilIndividualsIndexPromise;
}

export async function warmFossilIndividualsIndex(): Promise<NookipediaFossilIndividualItem[] | null> {
  try {
    return await fetchFossilIndividualsIndex();
  } catch {
    return null;
  }
}

/**
 * Names list.
 * If excludedetails=true isn't supported here, fallback to mapping from index.
 */
export async function fetchFossilIndividualNames(): Promise<string[]> {
  try {
    const q = buildQuery({ excludedetails: "true" });
    const names = await nookipediaFetchWithRetry<string[]>(`/nh/fossils/individuals${q}`);
    return cleanNames(names);
  } catch {
    const items = await fetchFossilIndividualsIndex();
    return cleanNames(items.map((x) => x?.name));
  }
}

/**
 * Rich path: detail for ONE fossil individual by name.
 * thumbsize is harmless if ignored by endpoint.
 */
export async function fetchFossilIndividualByName(
  fossil: string,
  opts?: { thumbsize?: number }
): Promise<NookipediaFossilIndividualItem> {
  const safe = encodeURIComponent((fossil ?? "").trim());

  const q = buildQuery({
    thumbsize: opts?.thumbsize != null ? String(Math.trunc(opts.thumbsize)) : undefined,
  });

  return nookipediaFetchWithRetry<NookipediaFossilIndividualItem>(
    `/nh/fossils/individuals/${safe}${q}`
  );
}

// ---------- Groups ----------

let fossilGroupsIndexCache: { fetchedAt: number; items: NookipediaFossilGroupItem[] } | null = null;
let fossilGroupsIndexPromise: Promise<NookipediaFossilGroupItem[]> | null = null;

/**
 * Full index: ALL fossil groups (array of objects).
 * Cached + single in-flight Promise.
 */
export async function fetchFossilGroupsIndex(params?: {
  force?: boolean;
}): Promise<NookipediaFossilGroupItem[]> {
  const force = !!params?.force;

  if (!force && isFresh(fossilGroupsIndexCache)) {
    return fossilGroupsIndexCache!.items;
  }

  if (!force && fossilGroupsIndexPromise) {
    return fossilGroupsIndexPromise;
  }

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaFossilGroupItem[]>(
        `/nh/fossils/groups`
      );
      fossilGroupsIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      fossilGroupsIndexPromise = null;
    }
  };

  fossilGroupsIndexPromise = run();
  return fossilGroupsIndexPromise;
}

export async function warmFossilGroupsIndex(): Promise<NookipediaFossilGroupItem[] | null> {
  try {
    return await fetchFossilGroupsIndex();
  } catch {
    return null;
  }
}

export async function fetchFossilGroupNames(): Promise<string[]> {
  const items = await fetchFossilGroupsIndex();
  return cleanNames(items.map((x) => x?.name));
}

/**
 * Group detail: includes `fossils: [...]` list (with images)
 */
export async function fetchFossilGroupByName(
  fossilGroup: string
): Promise<NookipediaFossilGroupDetailItem> {
  const safe = encodeURIComponent((fossilGroup ?? "").trim());
  return nookipediaFetchWithRetry<NookipediaFossilGroupDetailItem>(`/nh/fossils/groups/${safe}`);
}

// ---------- "All" (search) ----------

let fossilsAllIndexCache: { fetchedAt: number; items: NookipediaFossilAllResult[] } | null = null;
let fossilsAllIndexPromise: Promise<NookipediaFossilAllResult[]> | null = null;

/**
 * Full "all" index: returns array of groups with fossils + matched (maybe null)
 * Cached + single in-flight Promise.
 */
export async function fetchFossilsAllIndex(params?: {
  force?: boolean;
}): Promise<NookipediaFossilAllResult[]> {
  const force = !!params?.force;

  if (!force && isFresh(fossilsAllIndexCache)) {
    return fossilsAllIndexCache!.items;
  }

  if (!force && fossilsAllIndexPromise) {
    return fossilsAllIndexPromise;
  }

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaFossilAllResult[]>(
        `/nh/fossils/all`
      );
      fossilsAllIndexCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      fossilsAllIndexPromise = null;
    }
  };

  fossilsAllIndexPromise = run();
  return fossilsAllIndexPromise;
}

export async function warmFossilsAllIndex(): Promise<NookipediaFossilAllResult[] | null> {
  try {
    return await fetchFossilsAllIndex();
  } catch {
    return null;
  }
}

/**
 * "All" detail by query:
 * - If you pass a group name, Nookipedia may match type=group
 * - If you pass an individual name, Nookipedia may match type=individual
 *
 * Returns ONE object (per your example)
 */
export async function fetchFossilsAllByName(
  fossilOrGroup: string
): Promise<NookipediaFossilAllResult> {
  const safe = encodeURIComponent((fossilOrGroup ?? "").trim());
  return nookipediaFetchWithRetry<NookipediaFossilAllResult>(`/nh/fossils/all/${safe}`);
}
