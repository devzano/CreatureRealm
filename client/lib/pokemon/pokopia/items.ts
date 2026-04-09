const POKOPIA_BASE_URL = "https://pokopiadex.com";
const ITEMS_TOKEN = '\\"allItems\\":';
const ITEM_GROUPS = [
  { url: `${POKOPIA_BASE_URL}/items?source=base`, sourceGroup: "Base" },
  { url: `${POKOPIA_BASE_URL}/items?source=event`, sourceGroup: "Event" },
] as const;

export type PokopiaItem = {
  id: number;
  slug: string;
  name: string;
  description: string;
  menuCategory: string;
  sources: string[];
  tags: string[];
  tradeSellValue: number;
  collectible: string;
  inventoryStatus: string;
  mosslax: string;
  event: string;
  sourceGroup: string;
  imageSrc: string;
  imageUrl: string;
};

let itemsCache: PokopiaItem[] | null = null;
let itemsPromise: Promise<PokopiaItem[]> | null = null;

function extractEscapedJsonArray(source: string, token: string): string {
  const tokenIndex = source.indexOf(token);
  if (tokenIndex < 0) {
    throw new Error("Pokopia items data was not found in the page.");
  }

  const start = source.indexOf("[", tokenIndex);
  if (start < 0) {
    throw new Error("Pokopia items array start was not found.");
  }

  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error("Pokopia items array end was not found.");
}

function decodeEscapedJson(escapedJson: string): string {
  return escapedJson
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function normalizeField(value: unknown): string {
  const text = String(value ?? "").trim();
  return text === "$undefined" ? "" : text;
}

function normalizeItems(raw: any[], sourceGroup: string): PokopiaItem[] {
  return raw.map((item) => ({
    id: Number(item?.id ?? 0),
    slug: normalizeField(item?.slug),
    name: normalizeField(item?.name),
    description: normalizeField(item?.description),
    menuCategory: normalizeField(item?.menu_category),
    sources: Array.isArray(item?.sources) ? item.sources.map((source: unknown) => normalizeField(source)).filter(Boolean) : [],
    tags: Array.isArray(item?.tags) ? item.tags.map((tag: unknown) => normalizeField(tag)).filter(Boolean) : [],
    tradeSellValue: Number(item?.trade_sell_value ?? 0),
    collectible: normalizeField(item?.collectible),
    inventoryStatus: normalizeField(item?.inventory_status),
    mosslax: normalizeField(item?.mosslax),
    event: normalizeField(item?.event),
    sourceGroup,
    imageSrc: normalizeField(item?.imageSrc),
    imageUrl: String(item?.imageSrc ?? "").startsWith("http")
      ? String(item.imageSrc)
      : `${POKOPIA_BASE_URL}${normalizeField(item?.imageSrc)}`,
  }));
}

export async function fetchPokopiaItems(): Promise<PokopiaItem[]> {
  if (itemsCache) {
    return itemsCache;
  }

  if (itemsPromise) {
    return itemsPromise;
  }

  itemsPromise = (async () => {
    const groupResults = await Promise.all(
      ITEM_GROUPS.map(async (group) => {
        const response = await fetch(group.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch Pokopia items (${group.sourceGroup}, ${response.status}).`);
        }

        const html = await response.text();
        const escapedJsonArray = extractEscapedJsonArray(html, ITEMS_TOKEN);
        const jsonArray = decodeEscapedJson(escapedJsonArray);
        const parsed = JSON.parse(jsonArray);

        return normalizeItems(Array.isArray(parsed) ? parsed : [], group.sourceGroup);
      })
    );

    const normalized = Array.from(
      new Map(
        groupResults
          .flat()
          .filter((item) => item.slug)
          .map((item) => [item.slug, item] as const)
      ).values()
    );
    itemsCache = normalized;
    return normalized;
  })();

  try {
    return await itemsPromise;
  } finally {
    itemsPromise = null;
  }
}
