const POKOPIA_BASE_URL = "https://pokopiadex.com";
const POKOPIA_RECIPES_URL = `${POKOPIA_BASE_URL}/recipes`;
const RECIPE_CATEGORY_ORDER = ["Furniture", "Misc.", "Outdoor", "Utilities", "Buildings", "Blocks", "Other"];

export type PokopiaRecipe = {
  id: string;
  slug: string;
  name: string;
  description: string;
  meta: string;
  category: string;
  imageUrl: string;
  href: string;
  badges: string[];
};

let recipesCache: PokopiaRecipe[] | null = null;
let recipesPromise: Promise<PokopiaRecipe[]> | null = null;

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
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(pathOrUrl: string): string {
  const value = decodeHtml(String(pathOrUrl ?? "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function extractCardBlocks(html: string): { block: string; category: string }[] {
  const tokens = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>|<div class="list-card" style="position:relative">/g)];
  if (!tokens.length) {
    throw new Error("Pokopia recipes data was not found in the page.");
  }

  const cards: { block: string; category: string }[] = [];
  let currentCategory = "Other";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token[1]) {
      currentCategory = stripTags(token[1]) || currentCategory;
      continue;
    }

    const start = token.index ?? 0;
    let end = html.length;
    for (let nextIndex = index + 1; nextIndex < tokens.length; nextIndex += 1) {
      if (!tokens[nextIndex][1]) {
        end = tokens[nextIndex].index ?? html.length;
        break;
      }
    }

    cards.push({
      block: html.slice(start, end),
      category: currentCategory,
    });
  }

  return cards;
}

function extractAttr(chunk: string, pattern: RegExp): string {
  const match = chunk.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function extractText(chunk: string, pattern: RegExp): string {
  const match = chunk.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
}

function extractBadges(chunk: string): string[] {
  const badges: string[] = [];
  const regex = /class="item-tag-badge"[^>]*>([\s\S]*?)<\/(?:a|span)>/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(chunk))) {
    const badge = stripTags(match[1]);
    if (badge) badges.push(badge);
  }

  return badges;
}

function normalizeRecipes(html: string): Map<string, PokopiaRecipe> {
  return extractCardBlocks(html)
    .map(({ block, category }) => {
      const href = extractAttr(block, /href="([^"]+)"/i);
      const name = extractText(block, /class="card-name"[^>]*>([\s\S]*?)<\/div>/i);
      if (!href || !name) return null;

      const imageUrl = extractAttr(block, /<img[^>]+src="([^"]+)"/i);
      const description = extractText(block, /class="card-description"[^>]*>([\s\S]*?)<\/div>/i);
      const meta = extractText(block, /class="card-meta"[^>]*>([\s\S]*?)<\/div>/i);
      const cleanHref = href.split("?")[0] ?? href;
      const slug = cleanHref.split("/").filter(Boolean).pop() ?? name.toLowerCase().replace(/\s+/g, "-");

      return {
        id: slug,
        slug,
        name,
        description,
        meta,
        category: category || "Other",
        imageUrl: toAbsoluteUrl(imageUrl),
        href: toAbsoluteUrl(href),
        badges: extractBadges(block),
      };
    })
    .filter(Boolean)
    .reduce((acc, recipe) => {
      const existing = acc.get(recipe!.id);
      if (!existing) {
        acc.set(recipe!.id, recipe as PokopiaRecipe);
      }
      return acc;
    }, new Map<string, PokopiaRecipe>());
}

function recipeMapToSortedList(recipeMap: Map<string, PokopiaRecipe>): PokopiaRecipe[] {
  return [...recipeMap.values()].sort((a, b) => {
    if (a.category !== b.category) {
      const aIndex = RECIPE_CATEGORY_ORDER.indexOf(a.category);
      const bIndex = RECIPE_CATEGORY_ORDER.indexOf(b.category);
      const normalizedA = aIndex === -1 ? RECIPE_CATEGORY_ORDER.length : aIndex;
      const normalizedB = bIndex === -1 ? RECIPE_CATEGORY_ORDER.length : bIndex;
      if (normalizedA !== normalizedB) {
        return normalizedA - normalizedB;
      }
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

export async function fetchPokopiaRecipes(): Promise<PokopiaRecipe[]> {
  if (recipesCache) {
    return recipesCache;
  }

  if (recipesPromise) {
    return recipesPromise;
  }

  recipesPromise = (async () => {
    const response = await fetch(POKOPIA_RECIPES_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia recipes (${response.status}).`);
    }

    const html = await response.text();
    const normalized = recipeMapToSortedList(normalizeRecipes(html));
    recipesCache = normalized;
    return normalized;
  })();

  try {
    return await recipesPromise;
  } finally {
    recipesPromise = null;
  }
}
