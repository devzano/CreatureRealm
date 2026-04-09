const POKOPIA_BASE_URL = "https://pokopiadex.com";
const POKOPIA_BUILDINGS_URL = `${POKOPIA_BASE_URL}/buildings`;

export type PokopiaBuilding = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pokemonCountLabel: string;
  imageUrl: string;
  href: string;
};

let buildingsCache: PokopiaBuilding[] | null = null;
let buildingsPromise: Promise<PokopiaBuilding[]> | null = null;

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
  const starts = [...html.matchAll(/<a\s+class="list-card"[^>]*href="\/buildings\/[^"]+"[^>]*>/g)];
  if (!starts.length) {
    throw new Error("Pokopia buildings data was not found in the page.");
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

function normalizeBuildings(html: string): PokopiaBuilding[] {
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
        imageUrl: toAbsoluteUrl(imageUrl),
        href: toAbsoluteUrl(href),
      };
    })
    .filter(Boolean) as PokopiaBuilding[];
}

export async function fetchPokopiaBuildings(): Promise<PokopiaBuilding[]> {
  if (buildingsCache) {
    return buildingsCache;
  }

  if (buildingsPromise) {
    return buildingsPromise;
  }

  buildingsPromise = (async () => {
    const response = await fetch(POKOPIA_BUILDINGS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia buildings (${response.status}).`);
    }

    const html = await response.text();
    const normalized = normalizeBuildings(html);
    buildingsCache = normalized;
    return normalized;
  })();

  try {
    return await buildingsPromise;
  } finally {
    buildingsPromise = null;
  }
}
