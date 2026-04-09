const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaCollectibleDetail = {
  slug: string;
  name: string;
  imageUrl: string;
  backGroupLabel: string;
  type: string;
  category: string;
  zone: string;
  location: string;
};

const cache = new Map<string, PokopiaCollectibleDetail>();
const inFlight = new Map<string, Promise<PokopiaCollectibleDetail>>();

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

function extractField(html: string, label: string): string {
  const regex = new RegExp(`<div class="detail-label">${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/div>[\\s\\S]*?<div class="detail-tag-row">([\\s\\S]*?)<\\/div>`, "i");
  const match = html.match(regex);
  return stripTags(match?.[1] ?? "");
}

function parseDetail(html: string, slug: string): PokopiaCollectibleDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([^<]+)<\/h1>/);
  const imageMatch = html.match(/<img alt="[^"]+"[^>]*width="160"[^>]*src="([^"]+)"/);
  const backLabelMatch = html.match(/Back to <!-- -->([^<]+)<\/span>/);

  return {
    slug,
    name: decodeHtml(titleMatch?.[1] ?? "").trim(),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    backGroupLabel: decodeHtml(backLabelMatch?.[1] ?? "").trim(),
    type: extractField(html, "Type"),
    category: extractField(html, "Category"),
    zone: extractField(html, "Zone"),
    location: extractField(html, "Location"),
  };
}

export async function fetchPokopiaCollectibleDetail(slug: string): Promise<PokopiaCollectibleDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia collectible slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;
  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/collectibles/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia collectible detail (${normalizedSlug}, ${response.status}).`);
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
