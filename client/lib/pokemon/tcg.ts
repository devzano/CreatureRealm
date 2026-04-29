const PAGE_SIZE = 250;

type TCGErrorPayload = {
  title?: string;
  details?: string;
  error?: {
    message?: string;
    code?: number;
  };
};

type TCGPagedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

export type PokemonTCGSet = {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt?: string;
  images: {
    symbol: string;
    logo: string;
  };
};

export type PokemonTCGCard = {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  rarity?: string;
  number: string;
  artist?: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
    ptcgoCode?: string;
    releaseDate?: string;
    images?: {
      symbol?: string;
      logo?: string;
    };
  };
};

function getProxyBase(): string {
  const base = String(process.env.EXPO_PUBLIC_RENDER_BASE_URL ?? "").trim();
  if (!base) {
    throw new Error("Missing Render base URL.");
  }

  return base.replace(/\/+$/, "");
}

async function tcgFetchRaw(path: string) {
  const proxyBase = getProxyBase();
  return fetch(`${proxyBase}/pokemontcg${path}`, {
    headers: {
      Accept: "application/json",
    },
  });
}

async function tcgFetch<T>(path: string): Promise<T> {
  const res = await tcgFetchRaw(path);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let parsed: TCGErrorPayload | null = null;

    try {
      parsed = body ? (JSON.parse(body) as TCGErrorPayload) : null;
    } catch {}

    const detail =
      parsed?.details ??
      parsed?.error?.message ??
      body ??
      res.statusText;

    throw new Error(`Pokemon TCG request failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as T;
}

const setsCache = new Map<string, Promise<PokemonTCGSet[]>>();
const cardsBySetCache = new Map<string, Promise<PokemonTCGCard[]>>();

function cleanSearch(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

export async function fetchPokemonTCGSets(): Promise<PokemonTCGSet[]> {
  const cacheKey = "all";
  const pending = setsCache.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const result = await tcgFetch<TCGPagedResponse<PokemonTCGSet>>(
      `/sets?page=1&pageSize=${PAGE_SIZE}&orderBy=-releaseDate`
    );

    return [...result.data].sort((a, b) => {
      const byDate = String(b.releaseDate ?? "").localeCompare(String(a.releaseDate ?? ""));
      if (byDate !== 0) return byDate;
      return a.name.localeCompare(b.name);
    });
  })();

  setsCache.set(cacheKey, promise);
  return promise;
}

export async function fetchPokemonTCGCardsForSet(setId: string): Promise<PokemonTCGCard[]> {
  const normalizedSetId = String(setId ?? "").trim();
  if (!normalizedSetId) throw new Error("Missing set id.");

  const pending = cardsBySetCache.get(normalizedSetId);
  if (pending) return pending;

  const promise = (async () => {
    const pages: PokemonTCGCard[] = [];
    let page = 1;

    while (true) {
      const query = encodeURIComponent(`set.id:${normalizedSetId}`);
      const result = await tcgFetch<TCGPagedResponse<PokemonTCGCard>>(
        `/cards?q=${query}&page=${page}&pageSize=${PAGE_SIZE}&orderBy=number,name`
      );

      pages.push(...result.data);

      if (result.count < PAGE_SIZE || pages.length >= result.totalCount) {
        break;
      }

      page += 1;
    }

    return pages;
  })();

  cardsBySetCache.set(normalizedSetId, promise);
  return promise;
}

export function filterPokemonTCGSets(
  sets: PokemonTCGSet[],
  options: { search?: string; series?: string | null }
) {
  const query = cleanSearch(options.search ?? "");
  const series = String(options.series ?? "").trim();

  return sets.filter((set) => {
    if (series && set.series !== series) return false;
    if (!query) return true;

    const haystack = `${set.name} ${set.series} ${set.ptcgoCode ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function getPokemonTCGSeries(sets: PokemonTCGSet[]) {
  return Array.from(new Set(sets.map((set) => set.series).filter(Boolean))).sort((a, b) => b.localeCompare(a));
}
