const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaDreamIslandItem = {
  slug: string;
  name: string;
  imageUrl: string;
  badge: string;
};

export type PokopiaDreamIsland = {
  slug: string;
  name: string;
  imageUrl: string;
  materials: PokopiaDreamIslandItem[];
  dolls: PokopiaDreamIslandItem[];
};

export type PokopiaDreamIslandsPage = {
  title: string;
  description: string;
  countLabel: string;
  islands: PokopiaDreamIsland[];
};

let cache: PokopiaDreamIslandsPage | null = null;
let inFlight: Promise<PokopiaDreamIslandsPage> | null = null;

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

function parseSectionItems(sectionHtml: string, withBadge: boolean): PokopiaDreamIslandItem[] {
  return sectionHtml
    .split('style="position:relative;display:flex;z-index:1;pointer-events:auto"')
    .slice(1)
    .map((block) => {
      const hrefMatch = block.match(/href="\/items\/([^"?]+)[^"]*"/);
      const ariaLabelMatch = block.match(/aria-label="([^"]+)"/);
      const imageMatch = block.match(/<img[^>]+src="([^"]+)"/);
      const spans = [...block.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((match) => stripTags(match[1]));

      return {
        slug: decodeHtml(hrefMatch?.[1] ?? "").trim(),
        name: spans[0] || decodeHtml(ariaLabelMatch?.[1] ?? "").trim(),
        imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
        badge: withBadge ? spans[1] || "" : "",
      };
    })
    .filter((item) => item.slug && item.name);
}

function parseIslandCards(html: string): PokopiaDreamIsland[] {
  const parts = html.split('<div class="list-card" style="position:relative">').slice(1);

  return parts
    .map((part) => {
      const cardHtml = part.split('<div class="list-card" style="position:relative">')[0] ?? part;
      const headerMatch = cardHtml.match(/<a aria-label="([^"]+)" style="position:absolute;inset:0;border-radius:16px" href="\/dream-islands\/([^"]+)"><\/a>/);
      const imageMatch = cardHtml.match(/<img alt="[^"]*Dream Island"[^>]*src="([^"]+)"/);
      const materialsStart = cardHtml.indexOf("Primary Materials");
      const dollsStart = cardHtml.indexOf("Dolls");

      const materialsSection =
        materialsStart >= 0 && dollsStart > materialsStart ? cardHtml.slice(materialsStart, dollsStart) : "";
      const dollsSection = dollsStart >= 0 ? cardHtml.slice(dollsStart) : "";

      return {
        slug: decodeHtml(headerMatch?.[2] ?? "").trim(),
        name: decodeHtml(headerMatch?.[1] ?? "").trim(),
        imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
        materials: parseSectionItems(materialsSection, false).slice(0, 3),
        dolls: parseSectionItems(dollsSection, true).slice(0, 3),
      };
    })
    .filter((island) => island.name && island.slug);
}

function parsePage(html: string): PokopiaDreamIslandsPage {
  const titleMatch = html.match(/<h1[^>]*>(Dream Islands in Pokémon Pokopia)<\/h1>/);
  const descriptionMatch = html.match(/<p id="[^"]+"[^>]*>([\s\S]*?)<\/p>/);
  const countMatch = html.match(/text-transform:uppercase">([^<]*Dream Islands)<\/p>/i);

  return {
    title: stripTags(titleMatch?.[1] ?? "Dream Islands in Pokémon Pokopia"),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    countLabel: stripTags(countMatch?.[1] ?? ""),
    islands: parseIslandCards(html),
  };
}

export async function fetchPokopiaDreamIslands(): Promise<PokopiaDreamIslandsPage> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/dream-islands`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia dream islands (${response.status}).`);
    }

    const html = await response.text();
    const parsed = parsePage(html);
    cache = parsed;
    return parsed;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
