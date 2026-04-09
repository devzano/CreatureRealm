const POKOPIA_BASE_URL = "https://pokopiadex.com";

export type PokopiaRichBlock =
  | { type: "paragraph" | "heading" | "subheading" | "list-item"; text: string }
  | { type: "image"; imageUrl: string };

export type PokopiaGuideDetail = {
  slug: string;
  title: string;
  dateLabel: string;
  blocks: PokopiaRichBlock[];
};

const cache = new Map<string, PokopiaGuideDetail>();
const inFlight = new Map<string, Promise<PokopiaGuideDetail>>();

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

function toAbsoluteImageUrl(src: string): string {
  const value = decodeHtml(String(src ?? "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${POKOPIA_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function parseBlocks(html: string): PokopiaRichBlock[] {
  const blocks: PokopiaRichBlock[] = [];
  const regex = /<img\b([^>]*)>|<(p|h2|h3|li)\b[^>]*>([\s\S]*?)<\/\2>/g;

  for (const match of html.matchAll(regex)) {
    if (match[1] != null) {
      const srcMatch = match[1].match(/src="([^"]+)"/);
      const imageUrl = toAbsoluteImageUrl(srcMatch?.[1] ?? "");
      if (imageUrl) blocks.push({ type: "image", imageUrl });
      continue;
    }

    const tag = match[2];
    const text = stripTags(match[3] ?? "");
    if (!text) continue;

    if (tag === "h2") blocks.push({ type: "heading", text });
    else if (tag === "h3") blocks.push({ type: "subheading", text });
    else if (tag === "li") blocks.push({ type: "list-item", text });
    else blocks.push({ type: "paragraph", text });
  }

  return blocks;
}

function parseDetail(html: string, slug: string): PokopiaGuideDetail {
  const titleMatch = html.match(/<h1 class="detail-title"[^>]*>([\s\S]*?)<\/h1>/);
  const dateMatch = html.match(/<time[^>]*>([\s\S]*?)<\/time>/);
  const richTextMatch = html.match(/<div class="payload-richtext">([\s\S]*?)<\/div><\/div><\/article>/);

  return {
    slug,
    title: stripTags(titleMatch?.[1] ?? ""),
    dateLabel: stripTags(dateMatch?.[1] ?? "").replace(/^Published\s+/, ""),
    blocks: parseBlocks(richTextMatch?.[1] ?? ""),
  };
}

export async function fetchPokopiaGuideDetail(slug: string): Promise<PokopiaGuideDetail> {
  const normalizedSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!normalizedSlug) throw new Error("Missing Pokopia guide slug.");

  const cached = cache.get(normalizedSlug);
  if (cached) return cached;
  const pending = inFlight.get(normalizedSlug);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`${POKOPIA_BASE_URL}/guides/${normalizedSlug}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokopia guide detail (${normalizedSlug}, ${response.status}).`);
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
