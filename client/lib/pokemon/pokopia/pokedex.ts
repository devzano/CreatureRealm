const POKOPIA_BASE_URL = "https://pokopiadex.com";
const POKEDEX_GROUPS = [
  { path: "/pokedex", label: "Pokedex", idOffset: 0 },
  { path: "/pokedex/event", label: "Event Pokedex", idOffset: 1000 },
] as const;

export type PokopiaPokedexEntry = {
  id: number;
  dexNumber: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  groupLabel: string;
  badges: {
    name: string;
    iconUrl: string;
    href: string;
  }[];
};

let pokedexCache: PokopiaPokedexEntry[] | null = null;
let pokedexPromise: Promise<PokopiaPokedexEntry[]> | null = null;

function decodeHtml(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function toAbsoluteImageUrl(src: string): string {
  const value = decodeHtml(String(src ?? "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/_next/image?")) {
    try {
      const parsed = new URL(`${POKOPIA_BASE_URL}${value}`);
      const innerUrl = parsed.searchParams.get("url");
      if (innerUrl) {
        return `${POKOPIA_BASE_URL}${innerUrl.startsWith("/") ? innerUrl : `/${innerUrl}`}`;
      }
    } catch {
      return `${POKOPIA_BASE_URL}${value}`;
    }
  }

  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function parsePokedexEntries(
  html: string,
  group: { label: string; idOffset: number }
): PokopiaPokedexEntry[] {
  const starts = [...html.matchAll(/class="list-card"><a aria-label="([^"]+)"[^>]*href="\/pokedex\/([^"]+)"/g)];
  const blocks = starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? html.length : html.length;
    return html.slice(start, end);
  });

  const byDexNumber = new Map<number, PokopiaPokedexEntry>();

  for (const block of blocks) {
    const hrefMatch = block.match(/href="\/pokedex\/([^"]+)"/);
    const dexMatch = block.match(/<div class="card-meta">#(?:<!-- -->)?(\d+)<\/div>/);
    const nameMatch = block.match(/<div class="card-name">([^<]+)<\/div>/);
    const descMatch = block.match(/<div class="card-description"[^>]*>([^<]*)<\/div>/);
    const imageMatch = block.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);

    const dexNumber = Number(dexMatch?.[1] ?? 0);
    if (!Number.isInteger(dexNumber) || dexNumber <= 0 || byDexNumber.has(dexNumber)) {
      continue;
    }

    const badges = [...block.matchAll(/<a title="([^"]+)" href="([^"]+)"><div[^>]*><img alt="[^"]+"[^>]*src="([^"]+)"/g)].map(
      (badge) => ({
        name: decodeHtml(badge[1]).trim(),
        href: `${POKOPIA_BASE_URL}${badge[2]}`,
        iconUrl: toAbsoluteImageUrl(badge[3]),
      })
    );

    byDexNumber.set(dexNumber, {
      id: group.idOffset + dexNumber,
      dexNumber,
      slug: decodeHtml(hrefMatch?.[1] ?? ""),
      name: decodeHtml(nameMatch?.[1] ?? "").trim(),
      description: decodeHtml(descMatch?.[1] ?? "").trim(),
      imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
      groupLabel: group.label,
      badges,
    });
  }

  const items = Array.from(byDexNumber.values());
  items.sort((a, b) => a.id - b.id);
  return items;
}

export async function fetchPokopiaPokedex(): Promise<PokopiaPokedexEntry[]> {
  if (pokedexCache) return pokedexCache;
  if (pokedexPromise) return pokedexPromise;

  pokedexPromise = (async () => {
    const groupResults = await Promise.all(
      POKEDEX_GROUPS.map(async (group) => {
        const response = await fetch(`${POKOPIA_BASE_URL}${group.path}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch Pokopia pokedex (${group.path}, ${response.status}).`);
        }

        const html = await response.text();
        return parsePokedexEntries(html, group);
      })
    );

    const entries = groupResults.flat();

    if (!entries.length) {
      throw new Error("Pokopia pokedex data was not found in the page.");
    }

    pokedexCache = entries;
    return entries;
  })();

  try {
    return await pokedexPromise;
  } finally {
    pokedexPromise = null;
  }
}
