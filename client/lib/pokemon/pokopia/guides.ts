const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaGuideEntry = {
  slug: string;
  title: string;
  dateLabel: string;
  summary: string;
};

export type PokopiaGuidesPage = {
  title: string;
  description: string;
  entries: PokopiaGuideEntry[];
};

let cache: PokopiaGuidesPage | null = null;
let inFlight: Promise<PokopiaGuidesPage> | null = null;

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

function parseEntries(html: string): PokopiaGuideEntry[] {
  return html
    .split('<article class="detail-card card-hover-lift"')
    .slice(1)
    .map((block) => {
      const slugMatch = block.match(/href="\/guides\/([^"]+)"/);
      const ariaMatch = block.match(/aria-label="([^"]+)"/);
      const dateMatch = block.match(/<time[^>]*>([\s\S]*?)<\/time>/);
      const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const summaryMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);

      return {
        slug: decodeHtml(slugMatch?.[1] ?? "").trim(),
        title: stripTags(titleMatch?.[1] ?? ariaMatch?.[1] ?? ""),
        dateLabel: stripTags(dateMatch?.[1] ?? ""),
        summary: stripTags(summaryMatch?.[1] ?? ""),
      };
    })
    .filter((entry) => entry.slug && entry.title);
}

function parsePage(html: string): PokopiaGuidesPage {
  const titleMatch = html.match(/<h1[^>]*>(Guides)<\/h1>/);
  const descriptionMatch = html.match(/<p id="[^"]+"[^>]*>([\s\S]*?)<\/p>/);

  return {
    title: stripTags(titleMatch?.[1] ?? "Guides"),
    description: stripTags(descriptionMatch?.[1] ?? ""),
    entries: parseEntries(html),
  };
}

export async function fetchPokopiaGuides(): Promise<PokopiaGuidesPage> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/guides`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia guides (${response.status}).`);
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
