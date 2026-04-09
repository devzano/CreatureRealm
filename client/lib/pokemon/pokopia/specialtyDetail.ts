const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaSpecialtyPokemonDetail = {
  name: string;
  slug: string;
  dexNumber?: number;
  imageUrl: string;
};

export type PokopiaSpecialtyDetail = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  pokemon: PokopiaSpecialtyPokemonDetail[];
};

const cache = new Map<string, PokopiaSpecialtyDetail>();
const inFlight = new Map<string, Promise<PokopiaSpecialtyDetail>>();

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

function parsePokemonCards(block: string): PokopiaSpecialtyPokemonDetail[] {
  const starts = [...block.matchAll(/<div style="position:relative;display:flex">/g)];
  const pokemon: PokopiaSpecialtyPokemonDetail[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const end = index + 1 < starts.length ? starts[index + 1].index ?? block.length : block.length;
    const card = block.slice(start, end);

    const linkMatch = card.match(/<a[^>]*aria-label="([^"]+)"[^>]*href="\/pokedex\/([^"]+)"/);
    const imageMatch = card.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);
    const numberMatch = card.match(/>#(?:<!-- -->)?(\d+)<\/span>/);

    if (!linkMatch) continue;

    pokemon.push({
      name: decodeHtml(linkMatch[1]).trim(),
      slug: decodeHtml(linkMatch[2]),
      dexNumber: numberMatch?.[1] ? Number(numberMatch[1]) : undefined,
      imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    });
  }

  return Array.from(new Map(pokemon.map((entry) => [entry.slug, entry])).values());
}

function parseDetail(html: string, slug: string): PokopiaSpecialtyDetail {
  const titleMatch = html.match(/<h1 class="detail-title[^"]*"[^>]*>([^<]+)<\/h1>/);
  const descriptionMatch = html.match(/<p class="detail-description">([\s\S]*?)<\/p>/);
  const imageMatch = html.match(/<img alt="[^"]+"[^>]*width="160"[^>]*src="([^"]+)"/);
  const pokemonSection = html.match(/<h2 class="detail-card-title">Pokémon with [\s\S]*? Specialty<\/h2>([\s\S]*?)(?:<aside|<\/div><\/div><\/main>)/);
  const pokemon = parsePokemonCards(pokemonSection?.[1] ?? "");

  return {
    slug,
    name: decodeHtml(titleMatch?.[1] ?? "").trim(),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
    pokemon,
  };
}

export async function fetchPokopiaSpecialtyDetail(slug: string): Promise<PokopiaSpecialtyDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia specialty slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;
  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/specialties/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia specialty detail (${normalizedSlug}, ${response.status}).`);
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
