const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaFilteredItemEffectBadge = {
  slug: string;
  label: string;
  iconUrl: string;
};

export type PokopiaFilteredItemFavoriteBadge = {
  slug: string;
  label: string;
};

export type PokopiaFilteredItem = {
  slug: string;
  name: string;
  imageUrl: string;
  description: string;
  isRecipe: boolean;
  effects: PokopiaFilteredItemEffectBadge[];
  favorites: PokopiaFilteredItemFavoriteBadge[];
  categoryLabel?: string;
};

export type PokopiaFilteredItemGroup = {
  label: string;
  items: PokopiaFilteredItem[];
};

export type PokopiaFilteredItemsPage = {
  title: string;
  description: string;
  countLabel: string;
  groups: PokopiaFilteredItemGroup[];
};

type FilterParams = {
  favoriteSlug?: string | null;
  tagSlug?: string | null;
};

const cache = new Map<string, PokopiaFilteredItemsPage>();
const inFlight = new Map<string, Promise<PokopiaFilteredItemsPage>>();

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
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
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

function buildCacheKey({ favoriteSlug, tagSlug }: FilterParams) {
  return `${String(favoriteSlug ?? "").trim().toLowerCase()}::${String(tagSlug ?? "")
    .trim()
    .toLowerCase()}`;
}

function buildUrl({ favoriteSlug, tagSlug }: FilterParams) {
  const params = new URLSearchParams();
  if (favoriteSlug) params.set("favorite", favoriteSlug);
  if (tagSlug) params.set("tag", tagSlug);
  return `${POKOPIA_BASE_URL}/items?${params.toString()}`;
}

function parseCard(cardHtml: string): PokopiaFilteredItem | null {
  const linkMatch = cardHtml.match(/<a aria-label="([^"]+)"[^>]*href="\/items\/([^"?]+)(?:\?[^"]*)?"/i);
  if (!linkMatch?.[2]) return null;

  const imageMatch = cardHtml.match(/<img alt="[^"]*"[^>]*src="([^"]+)"/i);
  const nameMatch = cardHtml.match(/<div class="card-name">([\s\S]*?)<\/div>/i);
  const descriptionMatch = cardHtml.match(/<div class="card-description">([\s\S]*?)<\/div>/i);

  const effects = Array.from(
    new Map(
      [...cardHtml.matchAll(
        /<a class="item-tag-badge" href="\/items[^"]*tag=([^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g
      )].map((match) => {
        const label = stripTags(match[2]);
        const iconMatch = match[2].match(/<img alt=""[^>]*src="([^"]+)"/i);

        return [
          decodeHtml(match[1]).trim().toLowerCase(),
          {
            slug: decodeHtml(match[1]).trim().toLowerCase(),
            label,
            iconUrl: toAbsoluteImageUrl(iconMatch?.[1] ?? ""),
          },
        ];
      })
    ).values()
  );

  const favorites = Array.from(
    new Map(
      [...cardHtml.matchAll(
        /<a class="item-tag-badge" href="\/pokedex\/favorites\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      )].map((match) => [
        decodeHtml(match[1]).trim().toLowerCase(),
        {
          slug: decodeHtml(match[1]).trim().toLowerCase(),
          label: stripTags(match[2]),
        },
      ])
    ).values()
  );

  return {
    slug: decodeHtml(linkMatch[2]).trim(),
    name: stripTags(nameMatch?.[1] ?? "") || decodeHtml(linkMatch[1]).trim(),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    isRecipe: /class="item-recipe-badge"/i.test(cardHtml),
    effects,
    favorites,
  };
}

function parseGroups(listGridHtml: string): PokopiaFilteredItemGroup[] {
  const groupStarts = [...listGridHtml.matchAll(
    /<div style="grid-column:\s*1 \/ -1;[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2><\/div>/g
  )];

  if (!groupStarts.length) {
    const cards = [...listGridHtml.matchAll(/<div class="list-card"[\s\S]*?(?=<div class="list-card"|$)/g)]
      .map((match) => parseCard(match[0]))
      .filter(Boolean) as PokopiaFilteredItem[];

    return cards.length ? [{ label: "Items", items: cards }] : [];
  }

  const groups: PokopiaFilteredItemGroup[] = [];

  for (let index = 0; index < groupStarts.length; index += 1) {
    const label = stripTags(groupStarts[index][1]);
    const start = groupStarts[index].index ?? 0;
    const end = index + 1 < groupStarts.length ? groupStarts[index + 1].index ?? listGridHtml.length : listGridHtml.length;
    const sectionHtml = listGridHtml.slice(start, end);

    const cardStarts = [...sectionHtml.matchAll(/<div class="list-card"[^>]*>/g)];
    const items: PokopiaFilteredItem[] = [];

    for (let cardIndex = 0; cardIndex < cardStarts.length; cardIndex += 1) {
      const cardStart = cardStarts[cardIndex].index ?? 0;
      const cardEnd = cardIndex + 1 < cardStarts.length ? cardStarts[cardIndex + 1].index ?? sectionHtml.length : sectionHtml.length;
      const nextCard = parseCard(sectionHtml.slice(cardStart, cardEnd));
      if (nextCard) items.push(nextCard);
    }

    if (items.length) {
      groups.push({
        label,
        items: Array.from(new Map(items.map((item) => [item.slug, item])).values()),
      });
    }
  }

  return groups;
}

function parsePage(html: string): PokopiaFilteredItemsPage {
  const titleMatches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const descriptionMatches = [...html.matchAll(/<p id="[^"]+"[^>]*>([\s\S]*?)<\/p>/gi)];
  const countMatches = [...html.matchAll(/(\d+)(?:<!--\s*-->)?\s*(?:<!--\s*-->)?Items<\/p>/gi)];
  const filterMatches = [...html.matchAll(/<div class="category-filter-wrap"[^>]*>/gi)];

  const titleMatch = titleMatches.at(-1);
  const lastFilterIndex = filterMatches.at(-1)?.index ?? -1;
  const descriptionMatch =
    [...descriptionMatches].reverse().find((match) => (match.index ?? -1) < lastFilterIndex) ?? descriptionMatches.at(-1);
  const countMatch =
    [...countMatches].reverse().find((match) => (match.index ?? -1) < lastFilterIndex) ?? countMatches.at(-1);

  let listGridHtml = "";
  if (lastFilterIndex >= 0) {
    const listGridStart = html.indexOf('<div class="list-grid"', lastFilterIndex);
    const paginationStart = listGridStart >= 0 ? html.indexOf('<nav class="pagination-wrap"', listGridStart) : -1;
    if (listGridStart >= 0 && paginationStart > listGridStart) {
      const gridOpenEnd = html.indexOf(">", listGridStart);
      if (gridOpenEnd >= 0) {
        listGridHtml = html.slice(gridOpenEnd + 1, paginationStart);
      }
    }
  }

  if (!listGridHtml) {
    const fallbackGridMatches = [...html.matchAll(/<div class="list-grid"[^>]*>([\s\S]*?)<\/div><nav class="pagination-wrap"/gi)];
    listGridHtml = fallbackGridMatches.at(-1)?.[1] ?? "";
  }

  const groups = parseGroups(listGridHtml);

  return {
    title: stripTags(titleMatch?.[1] ?? "Items"),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    countLabel: countMatch ? `${countMatch[1]} Items` : "Items",
    groups,
  };
}

export async function fetchPokopiaFilteredItemsPage(
  params: FilterParams
): Promise<PokopiaFilteredItemsPage> {
  const favoriteSlug = String(params.favoriteSlug ?? "").trim().toLowerCase();
  const tagSlug = String(params.tagSlug ?? "").trim().toLowerCase();
  if (!favoriteSlug && !tagSlug) {
    throw new Error("Missing Pokopia item filter.");
  }

  const cacheKey = buildCacheKey({ favoriteSlug, tagSlug });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(buildUrl({ favoriteSlug, tagSlug }), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia filtered items (${response.status}).`);
    }

    const html = await response.text();
    const page = parsePage(html);
    cache.set(cacheKey, page);
    return page;
  })();

  inFlight.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}
