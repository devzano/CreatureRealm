const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaCardItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  meta: string;
  imageUrl: string;
  href: string;
  badges: string[];
};

type CardSectionKey =
  | "items"
  | "recipes"
  | "abilities"
  | "specialties"
  | "buildings"
  | "collectibles";

const SECTION_PATHS: Record<CardSectionKey, string> = {
  items: "/items",
  recipes: "/recipes",
  abilities: "/abilities",
  specialties: "/specialties",
  buildings: "/buildings",
  collectibles: "/collectibles",
};

const sectionCache = new Map<CardSectionKey, PokopiaCardItem[]>();
const sectionPromises = new Map<CardSectionKey, Promise<PokopiaCardItem[]>>();

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

function extractCardBlocks(html: string): string[] {
  const starts = [...html.matchAll(/<(?:a|div)\s+class="list-card"[^>]*>/g)];
  if (!starts.length) {
    throw new Error("Pokopia section cards were not found in the page.");
  }

  return starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? html.length : html.length;
    return html.slice(start, end);
  });
}

function parseCards(html: string): PokopiaCardItem[] {
  const blocks = extractCardBlocks(html);
  const items: PokopiaCardItem[] = [];

  for (const block of blocks) {
    const href = extractAttr(block, /href="([^"]+)"/i);
    const name = extractText(block, /class="card-name"[^>]*>([\s\S]*?)<\/(?:div|span)>/i);
    if (!href || !name) continue;

    const imageSrc = extractAttr(block, /<img[^>]+src="([^"]+)"/i);
    const description = extractText(block, /class="card-description"[^>]*>([\s\S]*?)<\/div>/i);
    const meta = extractText(block, /class="card-meta"[^>]*>([\s\S]*?)<\/div>/i);
    const cleanHref = href.split('"').join("").trim();
    const pathname = cleanHref.split("?")[0] ?? "";
    const slug = pathname.split("/").filter(Boolean).pop() ?? name.toLowerCase().replace(/\s+/g, "-");

    items.push({
      id: slug,
      slug,
      name,
      description,
      meta,
      imageUrl: toAbsoluteUrl(imageSrc),
      href: toAbsoluteUrl(cleanHref),
      badges: extractBadges(block),
    });
  }

  return items;
}

async function fetchSectionCards(section: CardSectionKey): Promise<PokopiaCardItem[]> {
  const cached = sectionCache.get(section);
  if (cached) return cached;

  const inflight = sectionPromises.get(section);
  if (inflight) return inflight;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}${SECTION_PATHS[section]}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia ${section} (${response.status}).`);
    }

    const html = await response.text();
    const cards = parseCards(html);

    if (!cards.length) {
      throw new Error(`Pokopia ${section} data was not found in the page.`);
    }

    sectionCache.set(section, cards);
    return cards;
  })();

  sectionPromises.set(section, promise);

  try {
    return await promise;
  } finally {
    sectionPromises.delete(section);
  }
}

export function fetchPokopiaItems() {
  return fetchSectionCards("items");
}

export function fetchPokopiaRecipes() {
  return fetchSectionCards("recipes");
}

export function fetchPokopiaAbilities() {
  return fetchSectionCards("abilities");
}

export function fetchPokopiaSpecialties() {
  return fetchSectionCards("specialties");
}

export function fetchPokopiaBuildings() {
  return fetchSectionCards("buildings");
}

export function fetchPokopiaCollectibles() {
  return fetchSectionCards("collectibles");
}
