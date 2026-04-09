const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaDreamIslandDetailItem = {
  slug: string;
  name: string;
  imageUrl: string;
  badge: string;
};

export type PokopiaDreamIslandDetail = {
  slug: string;
  name: string;
  imageUrl: string;
  description: string;
  materials: PokopiaDreamIslandDetailItem[];
  dolls: PokopiaDreamIslandDetailItem[];
};

const cache = new Map<string, PokopiaDreamIslandDetail>();
const inFlight = new Map<string, Promise<PokopiaDreamIslandDetail>>();

function decodeHtml(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
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
      if (innerUrl) return `${POKOPIA_BASE_URL}${innerUrl.startsWith("/") ? innerUrl : `/${innerUrl}`}`;
    } catch {
      return `${POKOPIA_BASE_URL}${value}`;
    }
  }

  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function parseItems(sectionHtml: string, withBadge: boolean): PokopiaDreamIslandDetailItem[] {
  const blocks = (sectionHtml.includes('<div class="detail-subcard"')
    ? sectionHtml.split('<div class="detail-subcard"')
    : sectionHtml.split('style="position:relative;display:flex"')
  )
    .slice(1)

  return blocks
    .map((block) => {
      const hrefMatch = block.match(/href="\/items\/([^"?]+)[^"]*"/);
      const ariaLabelMatch = block.match(/aria-label="([^"]+)"/);
      const imageMatch = block.match(/<img[^>]+src="([^"]+)"/);
      const spans = [...block.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
        .map((match) => stripTags(match[1]))
        .filter(Boolean);

      return {
        slug: decodeHtml(hrefMatch?.[1] ?? "").trim(),
        name: spans[0] || decodeHtml(ariaLabelMatch?.[1] ?? "").trim(),
        imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
        badge: withBadge ? spans[1] || "" : "",
      };
    })
    .filter((item) => item.slug && item.name);
}

function parseDetail(html: string, slug: string): PokopiaDreamIslandDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  const descriptionMatch = html.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const imageMatch = html.match(/<img alt="[^"]*Dream Island"[^>]*src="([^"]+)"/);

  const materialsStart = html.indexOf("Primary Materials");
  const dollsStart = html.indexOf("Dolls");
  const materialsSection = materialsStart >= 0 && dollsStart > materialsStart ? html.slice(materialsStart, dollsStart) : "";
  const dollsSection = dollsStart >= 0 ? html.slice(dollsStart) : "";

  return {
    slug,
    name: stripTags(titleMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    materials: parseItems(materialsSection, false),
    dolls: parseItems(dollsSection, true),
  };
}

export async function fetchPokopiaDreamIslandDetail(slug: string): Promise<PokopiaDreamIslandDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia dream island slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;
  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/dream-islands/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia dream island detail (${normalizedSlug}, ${response.status}).`);
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
