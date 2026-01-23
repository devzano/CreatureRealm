// lib/data/animalcrossing/nookipediaEvents.ts
import { nookipediaFetchWithRetry } from "./nookipedia";

export type NookipediaEventItem = {
  event?: string;
  date?: string; // YYYY-MM-DD
  type?: string; // Event (etc)
  url?: string;

  // API returns extra keys
  [k: string]: any;
};

/**
 * ---------- Events Index Cache ----------
 * Events endpoint has no /{event} detail route; treat it as index-only.
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let eventsCache: { fetchedAt: number; items: NookipediaEventItem[] } | null = null;
let eventsPromise: Promise<NookipediaEventItem[]> | null = null;

function isFresh(cache: typeof eventsCache) {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < INDEX_TTL_MS;
}

export async function fetchEventsIndex(opts?: { force?: boolean }): Promise<NookipediaEventItem[]> {
  const force = !!opts?.force;

  if (!force && isFresh(eventsCache)) return eventsCache!.items;
  if (!force && eventsPromise) return eventsPromise;

  const run = async () => {
    try {
      const items = await nookipediaFetchWithRetry<NookipediaEventItem[]>(`/nh/events`);
      eventsCache = { fetchedAt: Date.now(), items };
      return items;
    } finally {
      eventsPromise = null;
    }
  };

  eventsPromise = run();
  return eventsPromise;
}

export async function warmEventsIndex(): Promise<NookipediaEventItem[] | null> {
  try {
    return await fetchEventsIndex();
  } catch {
    return null;
  }
}

export async function fetchEventNames(): Promise<string[]> {
  const items = await fetchEventsIndex();
  return items
    .map((x) => String(x?.event ?? "").trim())
    .filter((s) => !!s);
}
