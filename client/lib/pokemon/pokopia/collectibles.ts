const POKOPIA_BASE_URL = "https://pokopiadex.com";
const POKOPIA_COLLECTIBLE_PLACEHOLDER_URL = `${POKOPIA_BASE_URL}/images/footer/pokeball.png`;
const COLLECTIBLES_TOKEN = '\\"allItems\\":';
const CATEGORIES_TOKEN = '\\"categories\\":';

const COLLECTIBLE_GROUPS = [
  { slug: "artifacts", label: "Artifacts" },
  { slug: "records", label: "Records" },
  { slug: "highlights", label: "Highlights" },
  { slug: "music-cds", label: "Music CDs" },
] as const;

export type PokopiaCollectible = {
  id: number;
  slug: string;
  name: string;
  groupSlug: string;
  groupLabel: string;
  subgroupSlug: string;
  subgroupLabel: string;
  type: string;
  menuCategory: string;
  zone: string;
  unlock: string;
  inventoryStatus: string;
  hasRecipe: boolean;
  imageSrc: string;
  imageUrl: string;
  detailPath: string;
  detailKind: "collectible" | "item";
};

let collectiblesCache: PokopiaCollectible[] | null = null;
let collectiblesPromise: Promise<PokopiaCollectible[]> | null = null;

function extractEscapedJsonArray(source: string, token: string): string {
  const tokenIndex = source.indexOf(token);
  if (tokenIndex < 0) {
    throw new Error("Pokopia collectibles data was not found in the page.");
  }

  const start = source.indexOf("[", tokenIndex);
  if (start < 0) {
    throw new Error("Pokopia collectibles array start was not found.");
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

  throw new Error("Pokopia collectibles array end was not found.");
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

function toAbsoluteUrl(pathOrUrl: string): string {
  const value = normalizeField(pathOrUrl);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function slugifySegment(value: string): string {
  return normalizeField(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractListCardLinks(html: string): Map<string, string> {
  const map = new Map<string, string>();

  for (const match of html.matchAll(/<div class="list-card"[\s\S]*?<a[^>]+href="([^"]+)"[\s\S]*?<div class="card-name">([\s\S]*?)<\/div>/g)) {
    const href = normalizeField(match[1]);
    const name = normalizeField(match[2].replace(/<[^>]+>/g, " "));
    if (!href || !name) continue;
    map.set(name.toLowerCase(), href);
  }

  return map;
}

function extractEscapedJsonStringArray(source: string, token: string): string[] {
  const escapedJsonArray = extractEscapedJsonArray(source, token);
  const jsonArray = decodeEscapedJson(escapedJsonArray);
  const parsed = JSON.parse(jsonArray);
  return Array.isArray(parsed) ? parsed.map((value) => normalizeField(value)).filter(Boolean) : [];
}

async function fetchCollectibleSubgroupLinks(groupSlug: string, subgroupSlugs: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    subgroupSlugs.map(async (subgroupSlug) => {
      const response = await fetch(`${POKOPIA_BASE_URL}/collectibles/${groupSlug}/${subgroupSlug}`);
      if (!response.ok) {
        return new Map<string, string>();
      }

      const html = await response.text();
      return extractListCardLinks(html);
    })
  );

  return entries.reduce((merged, current) => {
    current.forEach((value, key) => merged.set(key, value));
    return merged;
  }, new Map<string, string>());
}

function normalizeCollectibles(
  raw: any[],
  group: { slug: string; label: string },
  detailPathByName: Map<string, string>
): PokopiaCollectible[] {
  return raw.map((item) => {
    const slug = normalizeField(item?.slug);
    const name = normalizeField(item?.name);
    const menuCategory = normalizeField(item?.menu_category);
    const detailPath =
      detailPathByName.get(name.toLowerCase()) ??
      (group.slug === "artifacts" ? `/items/${slug}` : `/collectibles/${slug}`);

    return {
      id: Number(item?.id ?? 0),
      slug,
      name,
      groupSlug: group.slug,
      groupLabel: group.label,
      subgroupSlug: slugifySegment(menuCategory),
      subgroupLabel: menuCategory,
      type: normalizeField(item?.type),
      menuCategory,
      zone: normalizeField(item?.zone),
      unlock: normalizeField(item?.unlock),
      inventoryStatus: normalizeField(item?.inventory_status),
      hasRecipe: Boolean(item?.has_recipe),
      imageSrc: normalizeField(item?.imageSrc),
      imageUrl: toAbsoluteUrl(item?.imageSrc) || POKOPIA_COLLECTIBLE_PLACEHOLDER_URL,
      detailPath,
      detailKind: detailPath.startsWith("/items/") ? "item" : "collectible",
    };
  });
}

export async function fetchPokopiaCollectibles(): Promise<PokopiaCollectible[]> {
  if (collectiblesCache) {
    return collectiblesCache;
  }

  if (collectiblesPromise) {
    return collectiblesPromise;
  }

  collectiblesPromise = (async () => {
    const groupResults = await Promise.all(
      COLLECTIBLE_GROUPS.map(async (group) => {
        const response = await fetch(`${POKOPIA_BASE_URL}/collectibles/${group.slug}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch Pokopia collectibles (${group.slug}, ${response.status}).`);
        }

        const html = await response.text();
        const escapedJsonArray = extractEscapedJsonArray(html, COLLECTIBLES_TOKEN);
        const jsonArray = decodeEscapedJson(escapedJsonArray);
        const parsed = JSON.parse(jsonArray);
        const subgroupLabels = extractEscapedJsonStringArray(html, CATEGORIES_TOKEN);
        const subgroupSlugs = subgroupLabels.map(slugifySegment).filter(Boolean);
        const detailPathByName =
          group.slug === "artifacts" || group.slug === "records"
            ? await fetchCollectibleSubgroupLinks(group.slug, subgroupSlugs)
            : extractListCardLinks(html);

        return normalizeCollectibles(Array.isArray(parsed) ? parsed : [], group, detailPathByName);
      })
    );

    const seen = new Set<string>();
    const normalized = groupResults
      .flat()
      .filter((item) => {
        const key = `${item.groupSlug}:${item.slug}:${item.detailPath}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    collectiblesCache = normalized;
    return normalized;
  })();

  try {
    return await collectiblesPromise;
  } finally {
    collectiblesPromise = null;
  }
}
