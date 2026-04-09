const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaFavoriteDetailItem = {
  slug: string;
  name: string;
  imageUrl: string;
};

export type PokopiaFavoriteDetailItemGroup = {
  label: string;
  items: PokopiaFavoriteDetailItem[];
};

export type PokopiaFavoriteDetailPokemon = {
  slug: string;
  name: string;
  dexNumber?: number;
  imageUrl: string;
};

export type PokopiaFavoriteDetail = {
  slug: string;
  name: string;
  description: string;
  itemGroups: PokopiaFavoriteDetailItemGroup[];
  pokemon: PokopiaFavoriteDetailPokemon[];
};

const cache = new Map<string, PokopiaFavoriteDetail>();
const inFlight = new Map<string, Promise<PokopiaFavoriteDetail>>();

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

function extractSection(html: string, titlePrefix: string): string {
  const match = html.match(
    new RegExp(
      `<h2 class="detail-card-title">${titlePrefix}[\\s\\S]*?<\\/h2>([\\s\\S]*?)(?=<div class="detail-card"|<aside|$)`,
      "i"
    )
  );

  return match?.[1] ?? "";
}

function parseItemGroups(sectionHtml: string): PokopiaFavoriteDetailItemGroup[] {
  const groups: PokopiaFavoriteDetailItemGroup[] = [];
  const starts = [
    ...sectionHtml.matchAll(/<div class="detail-label" style="margin-bottom:0\.4rem">([\s\S]*?)<\/div>/g),
  ];

  for (let index = 0; index < starts.length; index += 1) {
    const label = stripTags(starts[index][1]);
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? sectionHtml.length : sectionHtml.length;
    const groupBlock = sectionHtml.slice(start, end);

    const items = [...groupBlock.matchAll(
      /<a aria-label="([^"]+)"[^>]*href="\/items\/([^"]+)"[\s\S]*?<img alt="[^"]+"[^>]*src="([^"]+)"/g
    )].map((match) => ({
      name: decodeHtml(match[1]).trim(),
      slug: decodeHtml(match[2]).trim(),
      imageUrl: toAbsoluteImageUrl(match[3]),
    }));

    if (items.length) {
      groups.push({
        label,
        items: Array.from(new Map(items.map((item) => [item.slug, item])).values()),
      });
    }
  }

  return groups;
}

function parsePokemon(sectionHtml: string): PokopiaFavoriteDetailPokemon[] {
  const starts = [
    ...sectionHtml.matchAll(
      /<div style="position:relative;display:flex"><a aria-label="([^"]+)"[^>]*href="\/pokedex\/([^"]+)"/g
    ),
  ];
  const cards: PokopiaFavoriteDetailPokemon[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? sectionHtml.length : sectionHtml.length;
    const cardBlock = sectionHtml.slice(start, end);
    const imageMatch = cardBlock.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);
    const numberMatch = cardBlock.match(/#(\d+)<\/span>/);

    cards.push({
      name: decodeHtml(starts[index][1]).trim(),
      slug: decodeHtml(starts[index][2]).trim(),
      imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
      dexNumber: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
    });
  }

  return Array.from(new Map(cards.map((pokemon) => [pokemon.slug, pokemon])).values());
}

function parseDetail(html: string, slug: string): PokopiaFavoriteDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const descriptionMatch = html.match(/<p class="detail-description"[^>]*>([\s\S]*?)<\/p>/i);

  return {
    slug,
    name: stripTags(titleMatch?.[1] ?? ""),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    itemGroups: parseItemGroups(extractSection(html, "Items that count as")),
    pokemon: parsePokemon(extractSection(html, "Pokémon that love")),
  };
}

export async function fetchPokopiaFavoriteDetail(slug: string): Promise<PokopiaFavoriteDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia favorite slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;

  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/pokedex/favorites/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Pokopia favorite detail (${normalizedSlug}, ${response.status}).`
      );
    }

    const html = await response.text();
    const detail = parseDetail(html, normalizedSlug);
    cache.set(normalizedSlug, detail);
    return detail;
  })();

  inFlight.set(normalizedSlug, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(normalizedSlug);
  }
}
