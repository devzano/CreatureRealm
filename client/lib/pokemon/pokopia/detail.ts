const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaDetailBadge = {
  name: string;
  href: string;
  iconUrl: string;
};

export type PokopiaDetailTagLink = {
  label: string;
  href?: string;
};

export type PokopiaDetailHabitat = {
  slug: string;
  dexNumber?: number;
  name: string;
  imageUrl: string;
  rarity?: string;
  times: string[];
  weather: string[];
};

export type PokopiaLovedItem = {
  slug: string;
  name: string;
  imageUrl: string;
  tags: string[];
};

export type PokopiaLovedItemGroup = {
  label: string;
  items: PokopiaLovedItem[];
};

export type PokopiaSimilarPokemon = {
  slug: string;
  name: string;
  imageUrl: string;
  tags: string[];
};

export type PokopiaPokemonDetail = {
  slug: string;
  dexNumber: number;
  name: string;
  groupLabel: string;
  speciesLabel?: string;
  description: string;
  imageUrl: string;
  measurements?: string;
  badges: PokopiaDetailBadge[];
  teaches: string[];
  teachLinks: PokopiaDetailTagLink[];
  eventName?: string;
  idealHabitats: string[];
  idealHabitatLinks: PokopiaDetailTagLink[];
  favorites: string[];
  favoriteLinks: PokopiaDetailTagLink[];
  habitats: PokopiaDetailHabitat[];
  lovedItemGroups: PokopiaLovedItemGroup[];
  similarPokemon: PokopiaSimilarPokemon[];
};

const detailCache = new Map<string, PokopiaPokemonDetail>();
const detailPromises = new Map<string, Promise<PokopiaPokemonDetail>>();

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

function sectionBetween(html: string, titlePrefix: string, nextTitlePrefixes: string[]): string {
  const titleMatches = [...html.matchAll(/<h2 class="detail-card-title">([\s\S]*?)<\/h2>/g)];
  const startMatch = titleMatches.find((match) => stripTags(match[1]).startsWith(titlePrefix));
  if (!startMatch || startMatch.index == null) return "";

  const start = startMatch.index;
  const startOffset = titleMatches.findIndex((match) => match.index === start);

  let end = html.length;
  for (let index = startOffset + 1; index < titleMatches.length; index += 1) {
    const nextTitle = stripTags(titleMatches[index][1]);
    if (nextTitlePrefixes.some((prefix) => nextTitle.startsWith(prefix))) {
      end = titleMatches[index].index ?? html.length;
      break;
    }
  }

  return html.slice(start, end);
}

function parseBadges(block: string): PokopiaDetailBadge[] {
  const badges = [...block.matchAll(/<a title="([^"]+)"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g)].map(
    (match) => ({
      name: decodeHtml(match[1]).trim(),
      href: `${POKOPIA_BASE_URL}${match[2]}`,
      iconUrl: toAbsoluteImageUrl(match[3]),
    })
  );

  return Array.from(new Map(badges.map((badge) => [badge.href, badge])).values());
}

function toAbsoluteHref(href: string): string {
  const value = decodeHtml(String(href ?? "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function parseDetailTagLinks(block: string): PokopiaDetailTagLink[] {
  const links: PokopiaDetailTagLink[] = [];

  for (const match of block.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const label = stripTags(match[2]);
    if (!label) continue;
    links.push({
      label,
      href: toAbsoluteHref(match[1]),
    });
  }

  for (const match of block.matchAll(/<span[^>]*class="detail-tag"[^>]*>([\s\S]*?)<\/span>/g)) {
    const label = stripTags(match[1]);
    if (!label) continue;
    links.push({ label });
  }

  return Array.from(
    new Map(links.map((entry) => [`${entry.href ?? ""}::${entry.label}`, entry])).values()
  );
}

function parseDetailTags(block: string): string[] {
  return Array.from(new Set(parseDetailTagLinks(block).map((entry) => entry.label)));
}

function parseHeroTeaches(block: string): PokopiaDetailTagLink[] {
  const teachesBlock = block.match(/<div class="detail-label">Teaches<\/div><div class="detail-tag-row">([\s\S]*?)<\/div><\/div>/);
  if (!teachesBlock) return [];
  return parseDetailTagLinks(teachesBlock[1]);
}

function parseHabitats(block: string): PokopiaDetailHabitat[] {
  const starts = [...block.matchAll(/<div class="detail-subcard"/g)];
  const parsed: PokopiaDetailHabitat[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? block.length : block.length;
    const card = block.slice(start, end);

    const slugMatch = card.match(/href="\/habitats\/([^"]+)"/);
    const numberMatch = card.match(/#(?:<!-- -->)?(\d+)<\/span>/);
    const nameMatch = card.match(/<h3 class="detail-subcard-title"[^>]*>([^<]+)<\/h3>/);
    const imageMatch = card.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);
    const rarityMatch = card.match(/<span style="font-size:0\.8rem[^"]*"[^>]*>([^<]+)<\/span>/);

    const timesMatch = card.match(/<div class="detail-label">Time<\/div>[\s\S]*?<div style="display:flex;gap:5px;width:100%">([\s\S]*?)<\/div><\/div><\/div>/);
    const weatherMatch = card.match(/<div class="detail-label">Weather<\/div>[\s\S]*?<div style="display:flex;gap:5px;width:100%">([\s\S]*?)<\/div><\/div><\/div>/);

    const times = Array.from(new Set([...(timesMatch?.[1].matchAll(/title="([^"]+)"/g) ?? [])].map((match) => decodeHtml(match[1]).trim())));
    const weather = Array.from(new Set([...(weatherMatch?.[1].matchAll(/title="([^"]+)"/g) ?? [])].map((match) => decodeHtml(match[1]).trim())));

    if (!slugMatch || !nameMatch) continue;

    parsed.push({
      slug: decodeHtml(slugMatch[1]),
      dexNumber: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
      name: decodeHtml(nameMatch[1]).trim(),
      imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
      rarity: rarityMatch ? stripTags(rarityMatch[1]) : undefined,
      times,
      weather,
    });
  }

  return Array.from(new Map(parsed.map((habitat) => [habitat.slug, habitat])).values());
}

function parseLovedItemGroups(block: string): PokopiaLovedItemGroup[] {
  const groups: PokopiaLovedItemGroup[] = [];
  const starts = [...block.matchAll(/<div class="detail-label" style="margin-bottom:0\.4rem">([^<]+)<\/div>/g)];

  for (let index = 0; index < starts.length; index += 1) {
    const label = decodeHtml(starts[index][1]).trim();
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? block.length : block.length;
    const groupBlock = block.slice(start, end);

    const itemStarts = [...groupBlock.matchAll(/<div style="position:relative;display:flex"><a[^>]*aria-label="([^"]+)"[^>]*href="\/items\/([^"]+)"/g)];
    const items: PokopiaLovedItem[] = [];

    for (let itemIndex = 0; itemIndex < itemStarts.length; itemIndex += 1) {
      const itemStart = itemStarts[itemIndex].index ?? 0;
      const itemEnd = itemIndex + 1 < itemStarts.length ? itemStarts[itemIndex + 1].index ?? groupBlock.length : groupBlock.length;
      const itemBlock = groupBlock.slice(itemStart, itemEnd);
      const imageMatch = itemBlock.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);
      const tags = [...itemBlock.matchAll(/<span style="[^"]*(?:0\.62rem|0\.7rem)[^"]*"[^>]*>([^<]+)<\/span>/g)]
        .map((match) => stripTags(match[1]))
        .filter(Boolean);

      items.push({
        slug: decodeHtml(itemStarts[itemIndex][2]),
        name: decodeHtml(itemStarts[itemIndex][1]).trim(),
        imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
        tags: Array.from(new Set(tags)),
      });
    }

    if (items.length) {
      groups.push({ label, items: Array.from(new Map(items.map((item) => [item.slug, item])).values()) });
    }
  }

  return groups;
}

function parseSimilarPokemon(block: string): PokopiaSimilarPokemon[] {
  const starts = [...block.matchAll(/<div style="display:flex;flex-direction:column;gap:0\.5rem;padding:0\.5rem 0\.75rem;border-radius:0\.5rem;[^"]*">/g)];
  const similar: PokopiaSimilarPokemon[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? block.length : block.length;
    const itemBlock = block.slice(start, end);

    const match = itemBlock.match(/<a[^>]*href="\/pokedex\/([^"]+)"[^>]*><img alt="([^"]+)"[^>]*src="([^"]+)"/);
    if (!match) continue;

    const tagsBlock = itemBlock.match(/<div class="detail-tag-row">([\s\S]*?)<\/div>/);
    similar.push({
      slug: decodeHtml(match[1]),
      name: decodeHtml(match[2]).trim(),
      imageUrl: toAbsoluteImageUrl(match[3]),
      tags: tagsBlock ? parseDetailTags(tagsBlock[1]) : [],
    });
  }

  return Array.from(new Map(similar.map((pokemon) => [pokemon.slug, pokemon])).values());
}

function parseDetail(html: string, slug: string): PokopiaPokemonDetail {
  const heroBlock = html.match(/<div class="detail-card">[\s\S]*?<div class="flex flex-col gap-4/);
  const hero = heroBlock?.[0] ?? html;

  const titleMatch = hero.match(/<h1 class="detail-title[^"]*"[^>]*><span[^>]*>#(?:<!-- -->)?(\d+)<\/span>([^<]+)<\/h1>/);
  const speciesLabelMatch = hero.match(/<div class="flex items-center justify-center lg:justify-start flex-wrap gap-3"[^>]*><span[^>]*>([^<]+)<\/span>/);
  const descriptionMatch = hero.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const imageMatch = hero.match(/<img alt="[^"]+"[^>]*width="256"[^>]*src="([^"]+)"/);
  const measurementsMatch = hero.match(/<p style="font-size:0\.8rem[^"]*"[^>]*>([^<]+)<\/p>/);
  const eventNameMatch = hero.match(/<div class="detail-label">Event<\/div><div class="detail-tag-row">[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
  const metaDescriptionMatch = html.match(/<meta name="description" content="([^"]+)"/);

  const specialtiesBlock = sectionBetween(
    html,
    "Specialties & Likes",
    ["Loved Items by", "Loved Items", "Great Roommates for", "Similar Pokémon", "Explore the Database"]
  );
  const lovedItemsBlock =
    sectionBetween(html, "Loved Items by", ["Great Roommates for", "Similar Pokémon", "Explore the Database"]) ||
    sectionBetween(html, "Loved Items", ["Great Roommates for", "Similar Pokémon", "Explore the Database"]);
  const similarBlock =
    sectionBetween(html, "Great Roommates for", ["Explore the Database"]) ||
    sectionBetween(html, "Similar Pokémon", ["Explore the Database"]);
  const whereBlock = sectionBetween(
    html,
    "Where to Find",
    ["Specialties & Likes", "Loved Items by", "Loved Items", "Great Roommates for", "Similar Pokémon", "Explore the Database"]
  );

  const idealHabitatMatch = specialtiesBlock.match(/<div class="detail-label">Ideal Habitat<\/div><div class="detail-tag-row">([\s\S]*?)<\/div><\/div>/);
  const favoritesMatch = specialtiesBlock.match(/<div class="detail-label">Favorites<\/div><div class="detail-tag-row">([\s\S]*?)<\/div><\/div>/);
  const teachLinks = parseHeroTeaches(hero);

  const title = decodeHtml(titleMatch?.[2] ?? "").trim();
  const groupLabel = slug.startsWith("event/") ? "Event Pokédex" : "Pokédex";

  if (!titleMatch || !title) {
    throw new Error(`Pokopia detail page could not be parsed for "${slug}".`);
  }

  return {
    slug,
    dexNumber: Number(titleMatch[1]),
    name: title,
    groupLabel,
    speciesLabel: speciesLabelMatch ? stripTags(speciesLabelMatch[1]) : undefined,
    description: descriptionMatch ? stripTags(descriptionMatch[1]) : stripTags(metaDescriptionMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    measurements: measurementsMatch ? stripTags(measurementsMatch[1]) : undefined,
    badges: parseBadges(hero),
    teaches: teachLinks.map((entry) => entry.label),
    teachLinks,
    eventName: eventNameMatch ? stripTags(eventNameMatch[1]) : undefined,
    idealHabitats: idealHabitatMatch ? parseDetailTags(idealHabitatMatch[1]) : [],
    idealHabitatLinks: idealHabitatMatch ? parseDetailTagLinks(idealHabitatMatch[1]) : [],
    favorites: favoritesMatch ? parseDetailTags(favoritesMatch[1]) : [],
    favoriteLinks: favoritesMatch ? parseDetailTagLinks(favoritesMatch[1]) : [],
    habitats: parseHabitats(whereBlock),
    lovedItemGroups: parseLovedItemGroups(lovedItemsBlock),
    similarPokemon: parseSimilarPokemon(similarBlock),
  };
}

export async function fetchPokopiaPokemonDetail(slug: string): Promise<PokopiaPokemonDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) {
    throw new Error("Missing Pokopia detail slug.");
  }

  const cached = detailCache.get(normalizedSlug);
  if (cached) return cached;

  const inFlight = detailPromises.get(normalizedSlug);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/pokedex/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia detail (${normalizedSlug}, ${response.status}).`);
    }

    const html = await response.text();
    const detail = parseDetail(html, normalizedSlug);
    detailCache.set(normalizedSlug, detail);
    return detail;
  })();

  detailPromises.set(normalizedSlug, promise);

  try {
    return await promise;
  } finally {
    detailPromises.delete(normalizedSlug);
  }
}
