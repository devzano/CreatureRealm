const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaBuildingRequirement = {
  slug: string;
  name: string;
  qty: string;
  imageUrl: string;
};

export type PokopiaBuildingSpecialtyRequirement = {
  slug: string;
  name: string;
  qty: string;
  imageUrl: string;
};

export type PokopiaBuildingDetail = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  constructionTime: string;
  gridSize: string;
  occupants: string;
  type: string;
  floors: string;
  furnitureRequired: string;
  kitItemName: string;
  kitItemSlug: string;
  kitItemImageUrl: string;
  materialRequirements: PokopiaBuildingRequirement[];
  pokemonRequirements: PokopiaBuildingSpecialtyRequirement[];
};

const cache = new Map<string, PokopiaBuildingDetail>();
const inFlight = new Map<string, Promise<PokopiaBuildingDetail>>();

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSimpleField(block: string, label: string): string {
  const escaped = escapeRegExp(label);
  const match = block.match(
    new RegExp(
      `<div class="detail-label">${escaped}<\\/div>(?:<div class="detail-tag-row">([\\s\\S]*?)<\\/div>|<span[^>]*>([\\s\\S]*?)<\\/span>)`,
      "i"
    )
  );

  return stripTags(match?.[1] ?? match?.[2] ?? "");
}

function parseRequirementCards(block: string): {
  href: string;
  ariaLabel: string;
  name: string;
  qty: string;
  imageUrl: string;
}[] {
  const starts = [...block.matchAll(/<div class="materials-list-card[\s\S]*?"position:relative;display:flex;align-items:center"[\s\S]*?>/g)];
  const parsed: {
    href: string;
    ariaLabel: string;
    name: string;
    qty: string;
    imageUrl: string;
  }[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? block.length : block.length;
    const card = block.slice(start, end);

    const hrefMatch = card.match(/<a[^>]*href="([^"]+)"/);
    const ariaLabelMatch = card.match(/<a[^>]*aria-label="([^"]+)"/);
    const nameMatch = card.match(/materials-list-name"[^>]*>([^<]+)</);
    const qtyMatch = card.match(/materials-list-qty"[^>]*>×(?:<!-- -->)?(\d+)/);
    const imageSrc = card.match(/<img[^>]*src="([^"]+)"/);

    if (!nameMatch || !qtyMatch || !imageSrc) continue;

    parsed.push({
      href: decodeHtml(hrefMatch?.[1] ?? ""),
      ariaLabel: decodeHtml(ariaLabelMatch?.[1] ?? ""),
      name: stripTags(nameMatch[1]),
      qty: qtyMatch[1],
      imageUrl: toAbsoluteImageUrl(imageSrc[1]),
    });
  }

  return parsed;
}

function parseDetail(html: string, slug: string): PokopiaBuildingDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([^<]+)<\/h1>/);
  const descriptionMatch = html.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const heroBlock = html.slice(
    html.indexOf('<div class="detail-card">'),
    html.indexOf('<h2 class="detail-card-title">Construction Requirements')
  );
  const imageMatch = heroBlock.match(/<img alt="[^"]+"[^>]*width="160"[^>]*src="([^"]+)"/);
  const kitItemMatch = heroBlock.match(/<div class="detail-label">Kit Item<\/div>[\s\S]*?href="\/items\/([^"]+)"[\s\S]*?<img alt="([^"]+)"[\s\S]*?src="([^"]+)"/);
  const requirementsSection = html.match(/<h2 class="detail-card-title">Construction Requirements<\/h2>([\s\S]*?)(?:<aside|<\/div><\/div><\/main>)/);
  const sectionHtml = requirementsSection?.[1] ?? "";
  const materialsStart = sectionHtml.indexOf('<div class="detail-label">Materials</div>');
  const pokemonStart = sectionHtml.indexOf('<div class="detail-label">Pokémon Required</div>');
  const materialsBlock =
    materialsStart === -1 ? "" : sectionHtml.slice(materialsStart, pokemonStart === -1 ? sectionHtml.length : pokemonStart);
  const pokemonBlock = pokemonStart === -1 ? "" : sectionHtml.slice(pokemonStart);

  const materialRequirements = parseRequirementCards(materialsBlock).map((entry) => ({
    slug: entry.href.replace(/^\/items\//, ""),
    name: entry.name,
    imageUrl: entry.imageUrl,
    qty: entry.qty,
  }));

  const pokemonRequirements = parseRequirementCards(pokemonBlock).map((entry) => ({
    slug: entry.href.replace(/^\/specialties\//, ""),
    name: entry.name,
    imageUrl: entry.imageUrl,
    qty: entry.qty,
  }));

  return {
    slug,
    name: decodeHtml(titleMatch?.[1] ?? "").trim(),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    constructionTime: extractSimpleField(heroBlock, "Construction Time"),
    gridSize: extractSimpleField(heroBlock, "Grid Size"),
    occupants: extractSimpleField(heroBlock, "Occupants"),
    type: extractSimpleField(heroBlock, "Type"),
    floors: extractSimpleField(heroBlock, "Floors"),
    furnitureRequired: extractSimpleField(heroBlock, "Furniture Required"),
    kitItemName: decodeHtml(kitItemMatch?.[2] ?? "").trim(),
    kitItemSlug: decodeHtml(kitItemMatch?.[1] ?? "").trim(),
    kitItemImageUrl: toAbsoluteImageUrl(kitItemMatch?.[3] ?? ""),
    materialRequirements,
    pokemonRequirements,
  };
}

export async function fetchPokopiaBuildingDetail(slug: string): Promise<PokopiaBuildingDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia building slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;
  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/buildings/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia building detail (${normalizedSlug}, ${response.status}).`);
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
