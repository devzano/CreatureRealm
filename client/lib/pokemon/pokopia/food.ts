const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaFoodFlavor = {
  slug: string;
  routeSlug: string;
  label: string;
  color: string;
};

export type PokopiaFoodItem = {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  flavors: string[];
};

export type PokopiaFoodPage = {
  countLabel: string;
  flavors: PokopiaFoodFlavor[];
  items: PokopiaFoodItem[];
};

let cachedPage: PokopiaFoodPage | null = null;
let pendingPage: Promise<PokopiaFoodPage> | null = null;
const flavorCache = new Map<string, PokopiaFoodItem[]>();
const flavorPending = new Map<string, Promise<PokopiaFoodItem[]>>();

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function toAbsoluteImageUrl(src: string): string {
  const value = String(src ?? "").trim();
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

function stripTags(value: string): string {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function parsePage(html: string): PokopiaFoodPage {
  const countMatch = html.match(/(\d+)(?:<!--\s*-->)?\s*(?:<!--\s*-->)?Food Items/i);

  const flavors = [...html.matchAll(
    /<a class="category-filter-btn"[^>]*href="\/food(?:\/([^"]+))?"[^>]*>([\s\S]*?)<\/a>/g
  )]
    .map((match) => {
      const routeSlug = decodeHtml(match[1] ?? "").trim();
      const label = stripTags(match[2]);
      if (!label || label === "All Flavors") return null;
      const slug =
        routeSlug === "no-flavor"
          ? "no-flavor"
          : routeSlug
            ? `${routeSlug}-flavors`
            : "";
      return {
        slug,
        routeSlug,
        label,
        color:
          label === "Sweet"
            ? "#e13857"
            : label === "Dry"
              ? "#2a667d"
              : label === "Bitter"
                ? "#719820"
                : label === "Sour"
                  ? "#d69e0b"
                  : label === "Spicy"
                    ? "#ca2910"
                    : "#f59e0b",
      };
    })
    .filter(Boolean) as PokopiaFoodFlavor[];

  const items = [...html.matchAll(
    /<div class="list-card"[^>]*>[\s\S]*?<a aria-label="([^"]+)"[^>]*href="\/items\/([^"?]+)(?:\?[^"]*)?"[\s\S]*?<img alt="[^"]*"[^>]*src="([^"]+)"[\s\S]*?<div class="card-name">([\s\S]*?)<\/div>[\s\S]*?<div class="card-description">([\s\S]*?)<\/div>([\s\S]*?)<\/div><\/div>/g
  )].map((match, index) => {
    const tagsBlock = match[6] ?? "";
    const itemFlavors = [...tagsBlock.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
      .map((tagMatch) => stripTags(tagMatch[1]))
      .filter(Boolean);

    return {
      id: index + 1,
      slug: decodeHtml(match[2]).trim(),
      name: stripTags(match[4]) || decodeHtml(match[1]).trim(),
      description: stripTags(match[5]),
      imageUrl: toAbsoluteImageUrl(match[3]),
      flavors: itemFlavors,
    };
  });

  return {
    countLabel: countMatch ? `${countMatch[1]} Food Items` : "Food",
    flavors,
    items,
  };
}

function parseFoodItemsFromHtml(html: string): PokopiaFoodItem[] {
  return [...html.matchAll(
    /<div class="list-card"[^>]*>[\s\S]*?<a aria-label="([^"]+)"[^>]*href="\/items\/([^"?]+)(?:\?[^"]*)?"[\s\S]*?<img alt="[^"]*"[^>]*src="([^"]+)"[\s\S]*?<div class="card-name">([\s\S]*?)<\/div>[\s\S]*?<div class="card-description">([\s\S]*?)<\/div>([\s\S]*?)<\/div><\/div>/g
  )].map((match, index) => {
    const tagsBlock = match[6] ?? "";
    const itemFlavors = [...tagsBlock.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
      .map((tagMatch) => stripTags(tagMatch[1]))
      .filter(Boolean);

    return {
      id: index + 1,
      slug: decodeHtml(match[2]).trim(),
      name: stripTags(match[4]) || decodeHtml(match[1]).trim(),
      description: stripTags(match[5]),
      imageUrl: toAbsoluteImageUrl(match[3]),
      flavors: itemFlavors,
    };
  });
}

export async function fetchPokopiaFoodPage(): Promise<PokopiaFoodPage> {
  if (cachedPage) return cachedPage;
  if (pendingPage) return pendingPage;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/food`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia food (${response.status}).`);
    }

    const html = await response.text();
    const page = parsePage(html);
    cachedPage = page;
    return page;
  })();

  pendingPage = promise;

  try {
    return await promise;
  } finally {
    pendingPage = null;
  }
}

export async function fetchPokopiaFoodFlavorItems(routeSlug: string): Promise<PokopiaFoodItem[]> {
  const normalized = String(routeSlug ?? "").trim().toLowerCase();
  if (!normalized) return [];

  const cached = flavorCache.get(normalized);
  if (cached) return cached;

  const pending = flavorPending.get(normalized);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/food/${normalized}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia food flavor (${normalized}, ${response.status}).`);
    }

    const html = await response.text();
    const items = parseFoodItemsFromHtml(html);
    flavorCache.set(normalized, items);
    return items;
  })();

  flavorPending.set(normalized, promise);

  try {
    return await promise;
  } finally {
    flavorPending.delete(normalized);
  }
}
