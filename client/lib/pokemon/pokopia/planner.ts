const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaPlannerCatalogBuilding = {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  occupants: number;
  imageUrl: string;
};

let cache: PokopiaPlannerCatalogBuilding[] | null = null;
let inFlight: Promise<PokopiaPlannerCatalogBuilding[]> | null = null;

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

function toAbsoluteImageUrl(src: string): string {
  const value = decodeHtml(String(src ?? "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function parseCatalog(html: string): PokopiaPlannerCatalogBuilding[] {
  const start = html.indexOf('\\"allBuildings\\":[');
  if (start < 0) {
    throw new Error("Pokopia planner building catalog was not found in the page.");
  }

  const arrayStart = html.indexOf("[", start);
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < html.length; i += 1) {
    const char = html[i];
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }

  if (arrayStart < 0 || arrayEnd < 0) {
    throw new Error("Pokopia planner building catalog could not be parsed.");
  }

  const json = html.slice(arrayStart, arrayEnd + 1).replace(/\\"/g, '"');

  const parsed = JSON.parse(json) as {
    id: number | string;
    slug: string;
    name: string;
    type: string | null;
    occupants: number | null;
    imageSrc: string;
  }[];

  return parsed.map((entry) => ({
    id: String(entry.id ?? entry.slug ?? entry.name),
    slug: String(entry.slug ?? "").trim(),
    name: String(entry.name ?? "").trim(),
    type: entry.type ? String(entry.type).trim() : null,
    occupants: Math.max(0, Number(entry.occupants ?? 0) || 0),
    imageUrl: toAbsoluteImageUrl(entry.imageSrc ?? ""),
  }))
    .filter((entry) => entry.name && entry.occupants > 0);
}

export async function fetchPokopiaPlannerBuildings(): Promise<PokopiaPlannerCatalogBuilding[]> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/planner`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia planner catalog (${response.status}).`);
    }

    const html = await response.text();
    const parsed = parseCatalog(html);
    cache = parsed;
    return parsed;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
