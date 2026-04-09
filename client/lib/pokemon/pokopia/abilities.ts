const POKOPIA_BASE_URL = "https://pokopiadex.com";
const POKOPIA_ABILITIES_URL = `${POKOPIA_BASE_URL}/abilities`;
const POKOPIA_ABILITY_PLACEHOLDER_IMAGE_URL = `${POKOPIA_BASE_URL}/images/footer/pokeball.png`;

export type PokopiaAbility = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pokemonCountLabel: string;
  imageUrl: string;
  href: string;
};

let abilitiesCache: PokopiaAbility[] | null = null;
let abilitiesPromise: Promise<PokopiaAbility[]> | null = null;

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

function extractCardBlocks(html: string): string[] {
  const starts = [...html.matchAll(/<a\s+class="list-card"[^>]*href="\/abilities\/[^"]+"[^>]*>/g)];
  if (!starts.length) {
    throw new Error("Pokopia abilities data was not found in the page.");
  }

  return starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? html.length : html.length;
    return html.slice(start, end);
  });
}

function extractAttr(chunk: string, pattern: RegExp): string {
  const match = chunk.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function extractText(chunk: string, pattern: RegExp): string {
  const match = chunk.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
}

function normalizeAbilities(html: string): PokopiaAbility[] {
  return extractCardBlocks(html)
    .map((block) => {
      const href = extractAttr(block, /href="([^"]+)"/i);
      const name = extractText(block, /class="card-name"[^>]*>([\s\S]*?)<\/div>/i);
      if (!href || !name) return null;

      const imageUrl = extractAttr(block, /<img[^>]+src="([^"]+)"/i);
      const description = extractText(block, /class="card-description"[^>]*>([\s\S]*?)<\/div>/i);
      const pokemonCountLabel = extractText(block, /class="card-meta"[^>]*>([\s\S]*?)<\/div>/i);
      const cleanHref = href.split("?")[0] ?? href;
      const slug = cleanHref.split("/").filter(Boolean).pop() ?? name.toLowerCase().replace(/\s+/g, "-");

      return {
        id: slug,
        slug,
        name,
        description,
        pokemonCountLabel,
        imageUrl: imageUrl ? toAbsoluteUrl(imageUrl) : POKOPIA_ABILITY_PLACEHOLDER_IMAGE_URL,
        href: toAbsoluteUrl(href),
      };
    })
    .filter(Boolean) as PokopiaAbility[];
}

export async function fetchPokopiaAbilities(): Promise<PokopiaAbility[]> {
  if (abilitiesCache) {
    return abilitiesCache;
  }

  if (abilitiesPromise) {
    return abilitiesPromise;
  }

  abilitiesPromise = (async () => {
    const response = await fetch(POKOPIA_ABILITIES_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia abilities (${response.status}).`);
    }

    const html = await response.text();
    const normalized = normalizeAbilities(html);
    abilitiesCache = normalized;
    return normalized;
  })();

  try {
    return await abilitiesPromise;
  } finally {
    abilitiesPromise = null;
  }
}
