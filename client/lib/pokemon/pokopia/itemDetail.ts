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

export type PokopiaItemDetail = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  storage: string;
  effectTags: string[];
  favoriteTags: string[];
  whereToFind: string[];
  recipeMaterials: PokopiaItemMaterial[];
  recipeUnlockedBy: string[];
  usedInHabitats: PokopiaItemHabitatUsage[];
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

function extractSpanField(sectionHtml: string, label: string): string {
  const spanRegex = new RegExp(
    `<div class="detail-label">${escapeRegex(label)}<\\/div>[\\s\\S]*?<span[^>]*>([\\s\\S]*?)<\\/span>`,
    "i"
  );
  const match = sectionHtml.match(spanRegex);
  return stripTags(match?.[1] ?? "");
}

function extractUsedInHabitats(html: string): PokopiaItemHabitatUsage[] {
  const sectionMatch = html.match(
    /<h2 class="detail-card-title">Used in Habitats<\/h2>([\s\S]*?)(?=<div class="detail-card"|<aside|$)/i
  );
  if (!sectionMatch?.[1]) return [];

  return [...sectionMatch[1].matchAll(
    /href="\/habitats\/([^"]+)"[\s\S]*?<span[^>]*>#(?:<!-- -->)?(\d+)<\/span>[\s\S]*?<h3 class="detail-subcard-title"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<img alt="[^"]+"[^>]*src="([^"]+)"/g
  )].map((match) => ({
    slug: decodeHtml(match[1]),
    number: decodeHtml(match[2]).trim(),
    name: stripTags(match[3]),
    imageUrl: toAbsoluteImageUrl(match[4]),
  }));
}

function parseDetail(html: string, slug: string): PokopiaItemDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([^<]+)<\/h1>/);
  const descriptionMatch = html.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const imageMatch = html.match(/<img alt="[^"]+"[^>]*width="200"[^>]*src="([^"]+)"/);
  const categoryMatch = html.match(/<div class="detail-label">Category<\/div>[\s\S]*?<div class="detail-tag-row">[\s\S]*?class="detail-tag"[^>]*>([\s\S]*?)<\/a>/);
  const recipeCardMatch = html.match(/<h2 class="detail-card-title">Recipe<\/h2>([\s\S]*?)(?:<\/div><\/div><\/div><aside|<\/div><\/div><aside)/);

  const recipeMaterials = [...(recipeCardMatch?.[1].matchAll(/href="\/items\/([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?materials-list-qty"[^>]*>×(?:<!-- -->)?(\d+)/g) ?? [])].map((match) => ({
    slug: decodeHtml(match[1]),
    name: decodeHtml(match[2]).trim(),
    imageUrl: toAbsoluteImageUrl(match[3]),
    qty: match[4],
  }));

  const recipeUnlockedBy = [...(recipeCardMatch?.[1].matchAll(/class="detail-tag"[^>]*>([\s\S]*?)<\/span>/g) ?? [])]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  return {
    slug,
    name: decodeHtml(titleMatch?.[1] ?? "").trim(),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    category: stripTags(categoryMatch?.[1] ?? ""),
    storage: extractSpanField(html, "Storage"),
    effectTags: extractDetailField(html, "Effect"),
    favoriteTags: extractDetailField(html, "Pokémon Favorite"),
    whereToFind: extractDetailField(html, "Where to Find"),
    recipeMaterials,
    recipeUnlockedBy,
    usedInHabitats: extractUsedInHabitats(html),
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
