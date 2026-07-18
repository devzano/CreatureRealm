import { absUrl, BASE, cleanKey, firstMatch, htmlToText } from "./palworldDB";

export type PaldbUpdateCategory = "versionChanges" | "contentUpdates" | "patchNotes";

export type PaldbUpdateSection = {
  heading: string | null;
  paragraphs: string[];
  bullets: string[];
};

export type PaldbUpdateDetail = {
  title: string;
  date: string | null;
  url: string | null;
  summary: string | null;
  imageUrls: string[];
  sections: PaldbUpdateSection[];
  bodyText: string;
};

export type PaldbUpdateListItem = {
  id: string;
  category: PaldbUpdateCategory;
  title: string;
  description: string;
  date: string | null;
  imageUrl: string | null;
  href: string | null;
  url: string | null;
  prefetchedDetail: PaldbUpdateDetail | null;
};

export type PaldbHomeUpdates = {
  versionChanges: PaldbUpdateListItem[];
  contentUpdates: PaldbUpdateListItem[];
  patchNotes: PaldbUpdateListItem[];
};

const HOME_TTL = 1000 * 60 * 10;
const DETAIL_TTL = 1000 * 60 * 10;

let homeCache: PaldbHomeUpdates | null = null;
let homeCacheAt = 0;
let homePending: Promise<PaldbHomeUpdates> | null = null;

const detailCache = new Map<string, { at: number; value: PaldbUpdateDetail }>();
const detailPending = new Map<string, Promise<PaldbUpdateDetail>>();

function decodeHtmlAttribute(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function slugify(value: string) {
  return cleanKey(value)
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isLikelyDateText(value: string) {
  return /\b\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{2}:\d{2}:\d{2}\s+UTC)?\b/.test(value);
}

function uniqueStrings(values: (string | null | undefined)[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = cleanKey(value ?? "");
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function extractImages(html: string) {
  const urls: string[] = [];
  const seen = new Set<string>();
  const re = /<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const url = absUrl(decodeHtmlAttribute(match[1]));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function parseSectionsFromBody(bodyHtml: string) {
  const sections: PaldbUpdateSection[] = [];
  let current: PaldbUpdateSection = {
    heading: null,
    paragraphs: [],
    bullets: [],
  };

  const blockRe = /<(h[1-6]|p|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(bodyHtml))) {
    const tag = match[1]?.toLowerCase() ?? "";
    const inner = match[2] ?? "";

    if (tag.startsWith("h")) {
      if (current.heading || current.paragraphs.length || current.bullets.length) {
        sections.push(current);
      }
      current = {
        heading: cleanKey(htmlToText(inner)) || null,
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    if (tag === "p") {
      const text = cleanKey(htmlToText(inner));
      if (!text) continue;
      current.paragraphs.push(text);
      continue;
    }

    const bullets = uniqueStrings(
      Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((entry) => cleanKey(htmlToText(entry[1] ?? "")))
    );
    if (bullets.length > 0) current.bullets.push(...bullets);
  }

  if (current.heading || current.paragraphs.length || current.bullets.length) {
    sections.push(current);
  }

  return sections.filter((section) => section.heading || section.paragraphs.length > 0 || section.bullets.length > 0);
}

function parseDetailFromBody(bodyHtml: string, url: string | null) {
  const headingMatch = bodyHtml.match(/<(h1|h2|h3|h4|h5|h6)[^>]*>([\s\S]*?)<\/\1>/i);
  const title =
    cleanKey(htmlToText(headingMatch?.[2] ?? "")) ||
    cleanKey(firstMatch(bodyHtml, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ?? "") ||
    "Palworld Update";

  const sections = parseSectionsFromBody(bodyHtml);

  let date: string | null = null;
  let summary: string | null = null;

  for (const section of sections) {
    if (!date) {
      date = section.paragraphs.find((paragraph) => isLikelyDateText(paragraph)) ?? null;
    }
    if (!summary) {
      summary =
        section.paragraphs.find((paragraph) => paragraph !== title && !isLikelyDateText(paragraph)) ??
        section.bullets[0] ??
        null;
    }
  }

  const bodyText = htmlToText(bodyHtml)
    .split("\n")
    .map((line) => cleanKey(line))
    .filter(Boolean)
    .join("\n");

  return {
    title,
    date,
    url,
    summary,
    imageUrls: extractImages(bodyHtml),
    sections,
    bodyText,
  } satisfies PaldbUpdateDetail;
}

function buildVersionHref(title: string) {
  const versionToken = title.match(/\b(?:v)?\d+(?:\.\d+)+\b/i)?.[0] ?? null;
  if (!versionToken) return null;
  const normalized = versionToken.toLowerCase().startsWith("v") ? versionToken : `v${versionToken}`;
  return normalized;
}

function isVersionHistoryTitle(value: string) {
  return /^(version|patch note|patch notes)\b/i.test(value) || /\bv\d+(?:\.\d+)+\b/i.test(value);
}

function splitVersionSections(html: string) {
  const pageHtml =
    firstMatch(html, /<div[^>]+class=["']page-content container["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i) ??
    html;
  const sections: string[] = [];
  const headingRe = /<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/gi;
  const headings = Array.from(pageHtml.matchAll(headingRe))
    .map((match) => ({
      index: match.index ?? -1,
      html: match[0] ?? "",
      text: cleanKey(htmlToText(match[2] ?? "")),
    }))
    .filter((entry) => entry.index >= 0 && isVersionHistoryTitle(entry.text));

  for (let index = 0; index < headings.length; index += 1) {
    const start = headings[index]!.index;
    const end = index + 1 < headings.length ? headings[index + 1]!.index : pageHtml.length;
    sections.push(pageHtml.slice(start, end));
  }

  return sections;
}

function parseVersionPage(html: string) {
  const items: PaldbUpdateListItem[] = [];
  const blocks = splitVersionSections(html);

  for (const bodyHtml of blocks) {
    const parsedDetail = parseDetailFromBody(bodyHtml, null);
    if (!isVersionHistoryTitle(parsedDetail.title)) continue;
    const href = buildVersionHref(parsedDetail.title);
    const anchor = slugify(parsedDetail.title);

    items.push({
      id: `version-${href ?? anchor}`,
      category: "versionChanges",
      title: parsedDetail.title,
      description: parsedDetail.summary ?? "Recent balance changes and bug fixes.",
      date: parsedDetail.date,
      imageUrl: parsedDetail.imageUrls[0] ?? null,
      href: anchor ? `version#${anchor}` : href,
      url: null,
      prefetchedDetail: {
        ...parsedDetail,
        url: null,
      },
    });
  }

  return items;
}

function findHomepageUpdateHeadings(html: string) {
  const headingRe = /<h5[^>]*>([\s\S]*?)<\/h5>/gi;
  const matches: { index: number; label: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(html))) {
    const label = cleanKey(htmlToText(match[1] ?? ""));
    if (!label) continue;
    if (label !== "Content Update" && label !== "News Patch") continue;
    matches.push({
      index: match.index ?? -1,
      label,
    });
  }

  return matches.filter((entry) => entry.index >= 0);
}

function sectionBounds(html: string, label: "Content Update" | "News Patch") {
  const headings = findHomepageUpdateHeadings(html);
  const currentIndex = headings.findIndex((entry) => entry.label === label);
  if (currentIndex < 0) return null;

  const start = headings[currentIndex]!.index;
  const end = currentIndex + 1 < headings.length ? headings[currentIndex + 1]!.index : html.length;
  return html.slice(start, end);
}

function parseCardSection(html: string, category: Exclude<PaldbUpdateCategory, "versionChanges">) {
  const items: PaldbUpdateListItem[] = [];
  const sectionHtml = sectionBounds(html, category === "contentUpdates" ? "Content Update" : "News Patch");
  if (!sectionHtml) return items;

  const starts = Array.from(sectionHtml.matchAll(/<div class="col">/gi)).map((entry) => entry.index ?? -1).filter((x) => x >= 0);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : sectionHtml.length;
    const cardHtml = sectionHtml.slice(start, end);
    const href = decodeHtmlAttribute(firstMatch(cardHtml, /<a[^>]+href="([^"]+)"/i) ?? "");
    const title =
      cleanKey(firstMatch(cardHtml, /<h5[^>]*class="card-title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ?? "") ||
      cleanKey(firstMatch(cardHtml, /<h5[^>]*class="card-title"[^>]*>([\s\S]*?)<\/h5>/i) ?? "") ||
      "Palworld Update";
    const description = cleanKey(
      firstMatch(cardHtml, /<p[^>]*class="card-text"(?![^>]*text-muted)[^>]*>([\s\S]*?)<\/p>/i) ?? ""
    );
    const date = cleanKey(firstMatch(cardHtml, /<small[^>]*class="text-muted"[^>]*>([^<]+)<\/small>/i) ?? "") || null;
    const imageUrl = absUrl(decodeHtmlAttribute(firstMatch(cardHtml, /<img[^>]+class="card-img-top"[^>]+src="([^"]+)"/i) ?? ""));

    const isExternal = /^https?:\/\//i.test(href);
    const rawHref = href ? (isExternal ? href : href.replace(/^\/+/, "")) : null;
    const normalizedHref =
      rawHref && rawHref !== "#" && !rawHref.toLowerCase().startsWith("javascript:")
        ? rawHref
        : null;
    const hrefSlug = normalizedHref ? slugify(normalizedHref) : "";
    const url = normalizedHref
      ? isExternal
        ? normalizedHref
        : absUrl(`/en/${normalizedHref}`)
      : null;

    const fallbackIdParts = [
      slugify(title) || "entry",
      date ? slugify(date) : null,
      String(index),
    ].filter(Boolean);

    items.push({
      id: `${category}-${hrefSlug || fallbackIdParts.join("-")}`,
      category,
      title,
      description: description || "Open to view the update summary.",
      date,
      imageUrl: imageUrl || null,
      href: normalizedHref || null,
      url,
      prefetchedDetail: {
        title,
        date,
        url,
        summary: description || null,
        imageUrls: imageUrl ? [imageUrl] : [],
        sections: [
          {
            heading: null,
            paragraphs: uniqueStrings([description || null]),
            bullets: [],
          },
        ].filter((section) => section.paragraphs.length > 0),
        bodyText: uniqueStrings([title, date, description]).join("\n"),
      },
    });
  }

  return items;
}

function extractMainDetailBody(html: string) {
  const body =
    firstMatch(html, /<div[^>]+class=['"]card-body clearfix['"][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i) ??
    firstMatch(html, /<div[^>]+class=['"]page-content container['"][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i) ??
    html;

  return body;
}

export function parsePaldbHomeUpdatesHtml(html: string): PaldbHomeUpdates {
  return {
    versionChanges: [],
    contentUpdates: parseCardSection(html, "contentUpdates"),
    patchNotes: parseCardSection(html, "patchNotes"),
  };
}

export function parsePaldbVersionUpdatesHtml(html: string) {
  return parseVersionPage(html);
}

export async function fetchPaldbHomeUpdates(opts?: { force?: boolean }) {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && homeCache && now - homeCacheAt < HOME_TTL) return homeCache;
  if (!force && homePending) return homePending;

  const request = (async () => {
    const headers = {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    };
    const [homeRes, versionRes] = await Promise.all([
      fetch(`${BASE}/en/`, { headers }),
      fetch(`${BASE}/en/version`, { headers }),
    ]);

    if (!homeRes.ok) {
      throw new Error(`fetchPaldbHomeUpdates failed: ${homeRes.status} ${homeRes.statusText}`);
    }
    if (!versionRes.ok) {
      throw new Error(`fetchPaldbVersionUpdates failed: ${versionRes.status} ${versionRes.statusText}`);
    }

    const [homeHtml, versionHtml] = await Promise.all([homeRes.text(), versionRes.text()]);
    const parsedHome = parsePaldbHomeUpdatesHtml(homeHtml);
    const parsed = {
      ...parsedHome,
      versionChanges: parsePaldbVersionUpdatesHtml(versionHtml),
    } satisfies PaldbHomeUpdates;
    homeCache = parsed;
    homeCacheAt = Date.now();
    return parsed;
  })();

  homePending = request;
  try {
    return await request;
  } finally {
    if (homePending === request) homePending = null;
  }
}

export async function fetchPaldbUpdateDetail(item: Pick<PaldbUpdateListItem, "url" | "prefetchedDetail">) {
  if (!item.url || !item.url.startsWith(`${BASE}/`)) {
    if (item.prefetchedDetail) return item.prefetchedDetail;
    throw new Error("No internal detail page available");
  }

  const cached = detailCache.get(item.url);
  if (cached && Date.now() - cached.at < DETAIL_TTL) return cached.value;

  const pending = detailPending.get(item.url);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(item.url!, {
      headers: {
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`fetchPaldbUpdateDetail failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const bodyHtml = extractMainDetailBody(html);
    const detail = parseDetailFromBody(bodyHtml, item.url);
    detailCache.set(item.url!, { at: Date.now(), value: detail });
    return detail;
  })();

  detailPending.set(item.url, request);
  try {
    return await request;
  } finally {
    detailPending.delete(item.url);
  }
}
