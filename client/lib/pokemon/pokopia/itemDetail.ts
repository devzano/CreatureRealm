const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaItemMaterial = {
  slug: string;
  name: string;
  qty: string;
  imageUrl: string;
};

export type PokopiaItemHabitatUsage = {
  slug: string;
  name: string;
  number: string;
  imageUrl: string;
};

export type PokopiaItemCookUsage = {
  slug: string;
  name: string;
  imageUrl: string;
};

export type PokopiaItemVariantImage = {
  label: string;
  imageUrl: string;
};

export type PokopiaItemDetail = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  variantImages: PokopiaItemVariantImage[];
  category: string;
  storage: string;
  mosslaxEffect: string;
  effectTags: string[];
  favoriteTags: string[];
  whereToFind: string[];
  recipeMaterials: PokopiaItemMaterial[];
  recipeUnlockedBy: string[];
  usedInHabitats: PokopiaItemHabitatUsage[];
  cookWithItems: PokopiaItemCookUsage[];
};

const cache = new Map<string, PokopiaItemDetail>();
const inFlight = new Map<string, Promise<PokopiaItemDetail>>();

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDetailField(sectionHtml: string, label: string): string[] {
  const fieldRegex = new RegExp(
    `<div class="detail-label">${escapeRegex(label)}<\\/div>[\\s\\S]*?<div class="detail-tag-row">([\\s\\S]*?)<\\/div>`,
    "i"
  );
  const match = sectionHtml.match(fieldRegex);
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/class="detail-tag"[^>]*>([\s\S]*?)<\/(?:a|span)>/g)]
    .map((entry) => stripTags(entry[1]))
    .filter(Boolean);
}

function extractDetailFieldLoose(sectionHtml: string, label: string): string[] {
  const fieldRegex = new RegExp(
    `<div class="detail-label">${escapeRegex(label)}<\\/div>[\\s\\S]*?<div class="detail-tag-row">([\\s\\S]*?)<\\/div>`,
    "i"
  );
  const match = sectionHtml.match(fieldRegex);
  if (!match?.[1]) return [];

  const tags = [...match[1].matchAll(/<(?:a|span)[^>]*>([\s\S]*?)<\/(?:a|span)>/g)]
    .map((entry) => stripTags(entry[1]))
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function extractSpanField(sectionHtml: string, label: string): string {
  const spanRegex = new RegExp(
    `<div class="detail-label">${escapeRegex(label)}<\\/div>[\\s\\S]*?<span[^>]*>([\\s\\S]*?)<\\/span>`,
    "i"
  );
  const match = sectionHtml.match(spanRegex);
  return stripTags(match?.[1] ?? "");
}

function extractSectionByTitle(html: string, titlePrefix: string): string {
  const match = html.match(
    new RegExp(
      `<h2 class="detail-card-title">${escapeRegex(titlePrefix)}[\\s\\S]*?<\\/h2>([\\s\\S]*?)(?=<div class="detail-card"|<aside|$)`,
      "i"
    )
  );

  return match?.[1] ?? "";
}

function extractUsedInHabitats(html: string): PokopiaItemHabitatUsage[] {
  const sectionHtml = extractSectionByTitle(html, "Used in Habitats");
  if (!sectionHtml) return [];

  return [...sectionHtml.matchAll(
    /href="\/habitats\/([^"]+)"[\s\S]*?<span[^>]*>#(?:<!-- -->)?(\d+)<\/span>[\s\S]*?<h3 class="detail-subcard-title"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<img alt="[^"]+"[^>]*src="([^"]+)"/g
  )].map((match) => ({
    slug: decodeHtml(match[1]),
    number: decodeHtml(match[2]).trim(),
    name: stripTags(match[3]),
    imageUrl: toAbsoluteImageUrl(match[4]),
  }));
}

function extractCookWithItems(html: string): PokopiaItemCookUsage[] {
  const titleMatch = html.match(/<h2 class="detail-card-title">Cook with ([\s\S]*?)<\/h2>/i);
  if (!titleMatch?.[1]) return [];

  const sectionHtml = extractSectionByTitle(html, `Cook with ${stripTags(titleMatch[1])}`);
  if (!sectionHtml) return [];

  return Array.from(
    new Map(
      [...sectionHtml.matchAll(
        /<a aria-label="([^"]+)"[^>]*href="\/items\/([^"]+)"[\s\S]*?<img alt="[^"]+"[^>]*src="([^"]+)"/g
      )].map((match) => [
        decodeHtml(match[2]).trim(),
        {
          slug: decodeHtml(match[2]).trim(),
          name: decodeHtml(match[1]).trim(),
          imageUrl: toAbsoluteImageUrl(match[3]),
        },
      ])
    ).values()
  );
}

function extractVariantImages(html: string): PokopiaItemVariantImage[] {
  return Array.from(
    new Map(
      [...html.matchAll(/<div title="([^"]+)"[^>]*>[\s\S]*?<img alt="[^"]+"[^>]*src="([^"]+)"/g)].map(
        (match) => [
          decodeHtml(match[1]).trim().toLowerCase(),
          {
            label: decodeHtml(match[1]).trim(),
            imageUrl: toAbsoluteImageUrl(match[2]),
          },
        ]
      )
    ).values()
  );
}

function parseDetail(html: string, slug: string): PokopiaItemDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([^<]+)<\/h1>/);
  const descriptionMatch = html.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const imageMatch = html.match(/<img alt="[^"]+"[^>]*width="200"[^>]*src="([^"]+)"/);
  const categoryMatch = html.match(/<div class="detail-label">Category<\/div>[\s\S]*?<div class="detail-tag-row">[\s\S]*?class="detail-tag"[^>]*>([\s\S]*?)<\/a>/);
  const recipeSection =
    extractSectionByTitle(html, "Recipe") || extractSectionByTitle(html, "Cooking Recipe");

  const recipeMaterials = [...(recipeSection.matchAll(/href="\/(?:items|specialties)\/([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?(?:materials-list-qty"[^>]*>×(?:<!-- -->)?(\d+)|<span class="materials-list-name")/g) ?? [])].map((match) => ({
    slug: decodeHtml(match[1]),
    name: decodeHtml(match[2]).trim(),
    imageUrl: toAbsoluteImageUrl(match[3]),
    qty: match[4] || "1",
  }));

  const recipeUnlockedBy = [...(recipeSection.matchAll(/class="detail-tag"[^>]*>([\s\S]*?)<\/span>/g) ?? [])]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  return {
    slug,
    name: decodeHtml(titleMatch?.[1] ?? "").trim(),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    variantImages: extractVariantImages(html),
    category: stripTags(categoryMatch?.[1] ?? ""),
    storage: extractSpanField(html, "Storage"),
    mosslaxEffect: extractDetailFieldLoose(html, "Mosslax Effect").join(" • "),
    effectTags: extractDetailField(html, "Effect"),
    favoriteTags: extractDetailField(html, "Pokémon Favorite"),
    whereToFind: extractDetailFieldLoose(html, "Where to Find"),
    recipeMaterials,
    recipeUnlockedBy,
    usedInHabitats: extractUsedInHabitats(html),
    cookWithItems: extractCookWithItems(html),
  };
}

export async function fetchPokopiaItemDetail(slug: string): Promise<PokopiaItemDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia item slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;
  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/items/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia item detail (${normalizedSlug}, ${response.status}).`);
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
