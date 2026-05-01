const POKOPIA_BASE_URL = "https://pokopiadex.com";
const POKOPIA_ABILITY_PLACEHOLDER_IMAGE_URL = `${POKOPIA_BASE_URL}/images/footer/pokeball.png`;

export type PokopiaAbilityPokemonDetail = {
  name: string;
  slug: string;
  dexNumber?: number;
  imageUrl: string;
  types: {
    name: string;
    iconUrl: string;
  }[];
};

export type PokopiaAbilityDetail = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  pokemon: PokopiaAbilityPokemonDetail[];
};

const cache = new Map<string, PokopiaAbilityDetail>();
const inFlight = new Map<string, Promise<PokopiaAbilityDetail>>();

function decodeHtml(value: string): string {
  return String(value ?? "")
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
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttr(tag: string, attr: string): string {
  const match = tag.match(new RegExp(`${attr}="([^"]*)"`, "i"));
  return decodeHtml(match?.[1] ?? "").trim();
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
        const decodedInner = decodeURIComponent(innerUrl);
        return `${POKOPIA_BASE_URL}${decodedInner.startsWith("/") ? decodedInner : `/${decodedInner}`}`;
      }
    } catch {
      return `${POKOPIA_BASE_URL}${value}`;
    }
  }

  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function extractBestImageSrc(imgTag: string): string {
  const directSrc = getAttr(imgTag, "src");
  if (directSrc) return directSrc;

  const srcSet = getAttr(imgTag, "srcset");
  if (!srcSet) return "";

  return (
    srcSet
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean)
      .pop() ?? ""
  );
}

function parsePokemonCards(html: string): PokopiaAbilityPokemonDetail[] {
  const linkMatches = [
    ...html.matchAll(
      /<a\b[^>]*href="\/pokedex\/([^"]+)"[^>]*aria-label="([^"]+)"[^>]*>|<a\b[^>]*aria-label="([^"]+)"[^>]*href="\/pokedex\/([^"]+)"[^>]*>/gi
    ),
  ];

  const pokemon: PokopiaAbilityPokemonDetail[] = [];

  for (let index = 0; index < linkMatches.length; index += 1) {
    const match = linkMatches[index];
    const start = match.index ?? 0;
    const end = index + 1 < linkMatches.length ? linkMatches[index + 1].index ?? html.length : html.length;
    const card = html.slice(start, end);

    const slug = decodeHtml(match[1] || match[4] || "").trim();
    const name = decodeHtml(match[2] || match[3] || "").trim();
    if (!slug || !name) continue;

    const imgTag = card.match(/<img\b[^>]*>/i)?.[0] ?? "";
    const numberMatch = card.match(/#\s*(?:<!--\s*-->)?\s*(\d{1,4})/i);

    const types = [
      ...card.matchAll(/title="([^"]+)"[\s\S]*?<img\b[^>]*(?:src|srcset)="([^"]+)"/gi),
    ]
      .map((typeMatch) => ({
        name: decodeHtml(typeMatch[1]).trim(),
        iconUrl: toAbsoluteImageUrl(typeMatch[2]),
      }))
      .filter(
        (type, typeIndex, list) =>
          type.name && list.findIndex((entry) => entry.name === type.name) === typeIndex
      );

    pokemon.push({
      name,
      slug,
      dexNumber: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
      imageUrl: toAbsoluteImageUrl(extractBestImageSrc(imgTag)) || POKOPIA_ABILITY_PLACEHOLDER_IMAGE_URL,
      types,
    });
  }

  return Array.from(new Map(pokemon.map((entry) => [entry.slug, entry])).values());
}

function parseDetail(html: string, slug: string): PokopiaAbilityDetail {
  const titleMatch = html.match(
    /<h1\b[^>]*class="[^"]*\bdetail-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i
  );

  const descriptionMatch = html.match(
    /<p\b[^>]*class="[^"]*\bdetail-description\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );

  const metaDescriptionMatch = html.match(
    /<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i
  );

  const abilityImageTag =
    html.match(/<img\b[^>]*width="160"[^>]*height="160"[^>]*>/i)?.[0] ??
    html.match(/<img\b[^>]*height="160"[^>]*width="160"[^>]*>/i)?.[0] ??
    "";

  const pokemonHeading = html.search(
    /<h2\b[^>]*class="[^"]*\bdetail-card-title\b[^"]*"[^>]*>\s*Pokémon that teach[\s\S]*?<\/h2>/i
  );

  const pokemonBlock = pokemonHeading >= 0 ? html.slice(pokemonHeading) : html;
  const pokemon = parsePokemonCards(pokemonBlock);

  return {
    slug,
    name: stripTags(titleMatch?.[1] ?? ""),
    description: stripTags(descriptionMatch?.[1] ?? metaDescriptionMatch?.[1] ?? ""),
    imageUrl:
      toAbsoluteImageUrl(extractBestImageSrc(abilityImageTag)) || POKOPIA_ABILITY_PLACEHOLDER_IMAGE_URL,
    pokemon,
  };
}

export async function fetchPokopiaAbilityDetail(slug: string): Promise<PokopiaAbilityDetail> {
  const normalizedSlug = String(slug ?? "")
    .replace(/^\/+/, "")
    .replace(/^abilities\//, "")
    .replace(/\/+$/, "");

  if (!normalizedSlug) throw new Error("Missing Pokopia ability slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;

  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/abilities/${normalizedSlug}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia ability detail (${normalizedSlug}, ${response.status}).`);
    }

    const html = await response.text();
    const detail = parseDetail(html, normalizedSlug);

    if (!detail.name && !detail.pokemon.length) {
      throw new Error("Pokopia ability detail markup could not be parsed.");
    }

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