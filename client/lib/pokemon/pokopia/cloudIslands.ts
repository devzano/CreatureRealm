const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaCloudIsland = {
  slug: string;
  name: string;
  imageUrl: string;
  code: string;
  tags: string[];
  likes: string;
};

export type PokopiaCloudIslandsPage = {
  title: string;
  description: string;
  countLabel: string;
  islands: PokopiaCloudIsland[];
};

let cache: PokopiaCloudIslandsPage | null = null;
let inFlight: Promise<PokopiaCloudIslandsPage> | null = null;

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

function parseIslandCards(html: string): PokopiaCloudIsland[] {
  return html
    .split('<div class="list-card" style="position:relative">')
    .slice(1)
    .map((block) => {
      const hrefMatch = block.match(/href="\/cloud-islands\/([^"]+)"/);
      const nameMatch = block.match(/class="card-name"[^>]*>([\s\S]*?)<\/div>/);
      const imageMatch = block.match(/<img alt="[^"]+"[^>]*src="([^"]+)"/);
      const codeMatch = block.match(/letter-spacing:0\.08em[^>]*>([\s\S]*?)<\/div>/);
      const likeMatch = block.match(/<span>(\d+)<\/span><\/button>/);
      const tagsBlockMatch = block.match(/display:flex;flex-wrap:wrap;gap:0\.3rem;align-items:center">([\s\S]*?)<\/div><\/div><\/div>/);
      const tags = [...(tagsBlockMatch?.[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g) ?? [])]
        .map((match) => stripTags(match[1]))
        .filter(Boolean);

      return {
        slug: decodeHtml(hrefMatch?.[1] ?? "").trim(),
        name: stripTags(nameMatch?.[1] ?? ""),
        imageUrl: toAbsoluteImageUrl(imageMatch?.[1] ?? ""),
        code: stripTags(codeMatch?.[1] ?? ""),
        tags,
        likes: decodeHtml(likeMatch?.[1] ?? "").trim(),
      };
    })
    .filter((island) => island.slug && island.name);
}

function parsePage(html: string): PokopiaCloudIslandsPage {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?Cloud Islands[\s\S]*?)<\/h1>/);
  const descriptionMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  const countMatch = html.match(/>(\d+\s+Islands)<\/p>/i);

  return {
    title: stripTags(titleMatch?.[1] ?? "Cloud Islands"),
    description: descriptionMatches[0] ?? "",
    countLabel: stripTags(countMatch?.[1] ?? ""),
    islands: parseIslandCards(html),
  };
}

export async function fetchPokopiaCloudIslands(): Promise<PokopiaCloudIslandsPage> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/cloud-islands`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia cloud islands (${response.status}).`);
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
