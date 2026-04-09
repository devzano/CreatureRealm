const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaHabitatRequirement = {
  name: string;
  slug: string;
  qty: string;
  imageUrl: string;
};

export type PokopiaHabitatPokemonDetail = {
  name: string;
  slug: string;
  dexNumber?: number;
  imageUrl: string;
  rarity?: string;
  times: string[];
  weather: string[];
};

export type PokopiaHabitatDetail = {
  slug: string;
  name: string;
  number?: number;
  description: string;
  imageUrl: string;
  requirements: PokopiaHabitatRequirement[];
  pokemon: PokopiaHabitatPokemonDetail[];
};

const cache = new Map<string, PokopiaHabitatDetail>();
const inFlight = new Map<string, Promise<PokopiaHabitatDetail>>();

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

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
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

function parseDetail(html: string, slug: string): PokopiaHabitatDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*><span[^>]*>#(?:<!-- -->)?(\d+)<\/span>([^<]+)<\/h1>/);
  const descriptionMatch = html.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const imageMatch = html.match(/<img alt="[^"]+"[^>]*width="800"[^>]*src="([^"]+)"/);

  const requirementsSection = html.match(/<h2 class="detail-card-title">Requirements<\/h2>([\s\S]*?)<\/div><\/div><div class="detail-card"/);
  const requirementMatches = [...(requirementsSection?.[1].matchAll(/href="\/items\/([^"]+)"[\s\S]*?<img alt="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?materials-list-qty"[^>]*>×(?:<!-- -->)?(\d+)/g) ?? [])];

  const pokemonSection = html.match(/<h2 class="detail-card-title">Pokémon in this Habitat<\/h2>([\s\S]*?)(?:<\/div><\/div><aside|<\/div><\/div><\/div><\/div><\/main>)/);
  const pokemonStarts = [...(pokemonSection?.[1].matchAll(/<div class="detail-subcard"/g) ?? [])];
  const pokemon: PokopiaHabitatPokemonDetail[] = [];

  for (let index = 0; index < pokemonStarts.length; index += 1) {
    const start = pokemonStarts[index].index ?? 0;
    const end = index + 1 < pokemonStarts.length ? pokemonStarts[index + 1].index ?? pokemonSection![1].length : pokemonSection![1].length;
    const block = pokemonSection![1].slice(start, end);

    const hrefMatch = block.match(/href="\/pokedex\/([^"]+)"/);
    const nameMatch = block.match(/aria-label="([^"]+)"/);
    const numberMatch = block.match(/#(?:<!-- -->)?(\d+)<\/span>/);
    const imageEntry = block.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);
    const rarityMatch = block.match(/<span style="font-size:0\.75rem;color:#666">([^<]+)<\/span>/);
    const times = [...block.matchAll(/title="([^"]+)"/g)].map((match) => decodeHtml(match[1]).trim());

    pokemon.push({
      slug: decodeHtml(hrefMatch?.[1] ?? ""),
      name: decodeHtml(nameMatch?.[1] ?? "").trim(),
      dexNumber: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
      imageUrl: toAbsoluteImageUrl(imageEntry?.[1] ?? ""),
      rarity: rarityMatch ? stripTags(rarityMatch[1]) : undefined,
      times: Array.from(new Set(times.slice(0, 4))),
      weather: Array.from(new Set(times.slice(4))),
    });
  }

  return {
    slug,
    name: decodeHtml(titleMatch?.[2] ?? "").trim(),
    number: titleMatch?.[1] ? Number(titleMatch[1]) : undefined,
    description: stripTags(descriptionMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    requirements: requirementMatches.map((match) => ({
      slug: decodeHtml(match[1]),
      name: decodeHtml(match[2]).trim(),
      imageUrl: toAbsoluteImageUrl(match[3]),
      qty: match[4],
    })),
    pokemon: pokemon.filter((entry) => entry.slug && entry.name),
  };
}

export async function fetchPokopiaHabitatDetail(slug: string, options?: { isEvent?: boolean }): Promise<PokopiaHabitatDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia habitat slug.");

  const routeKey = options?.isEvent ? `event:${normalizedSlug}` : normalizedSlug;
  const cached = cache.get(routeKey);
  if (cached) return cached;
  const pending = inFlight.get(routeKey);
  if (pending) return pending;

  const promise = (async () => {
    const path = options?.isEvent
      ? `/habitats/event/${normalizedSlug}`
      : `/habitats/${normalizedSlug}`;
    const response = await fetch(`${POKOPIA_BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia habitat detail (${normalizedSlug}, ${response.status}).`);
    }
    const html = await response.text();
    const detail = parseDetail(html, normalizedSlug);
    cache.set(routeKey, detail);
    return detail;
  })();

  inFlight.set(routeKey, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(routeKey);
  }
}
