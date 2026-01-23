// lib/data/palworld/paldbDeck.ts
import { absUrl, allMatches, BASE, cleanKey, dedup, extractSize64ImgUrl, firstMatch, parseNumberRawFromHash } from "./palworldDB";

export type PalListItem = {
  id: string; // slug, e.g. "Vixy"
  name: string;
  number: number; // numeric part only (e.g. "5B" -> 5)
  numberRaw?: string; // keeps suffix like "5B" if present
  url: string; // absolute paldb url
  iconUrl?: string | null; // left icon
  elements?: string[]; // from element tooltip(s) or element chips
};

export function parsePalListHtml(html: string): PalListItem[] {
  const startIdx = html.indexOf('id="Pal"');
  const slice = startIdx >= 0 ? html.slice(startIdx) : html;

  const items: PalListItem[] = [];
  const seen = new Set<string>();

  const colStartRe = /<div\s+class="col"[^>]*>/gi;
  const starts: number[] = [];
  let sm: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((sm = colStartRe.exec(slice))) starts.push(sm.index);

  const blocks: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const a = starts[i];
    const b = i + 1 < starts.length ? starts[i + 1] : slice.length;
    blocks.push(slice.slice(a, b));
  }

  for (const chunk of blocks) {
    const slug = firstMatch(chunk, /<a[^>]+class="itemname"[^>]+href="([^"]+)"[^>]*>/i);
    const name = firstMatch(chunk, /<a[^>]+class="itemname"[^>]*>([^<]+)<\/a>/i);

    if (!slug || !name) continue;

    if (slug.includes("/") || slug.startsWith("#") || slug.toLowerCase().includes("javascript")) {
      continue;
    }
    if (seen.has(slug)) continue;

    const numberRaw =
      firstMatch(chunk, /<span[^>]*>\s*#\s*([0-9]{1,4}[A-Za-z]?)\s*<\/span>/i) ??
      firstMatch(chunk, /#\s*([0-9]{1,4}[A-Za-z]?)/i) ??
      "0";

    const { number, numberRaw: normalizedRaw } = parseNumberRawFromHash(numberRaw);

    const iconUrlFromLeft = extractSize64ImgUrl(chunk);

    const iconUrl =
      iconUrlFromLeft ??
      firstMatch(
        chunk,
        /<img[^>]+src="(https?:\/\/cdn\.paldb\.cc\/[^"]+\/Pal\/Texture\/PalIcon\/[^"]+\.(?:png|jpg|jpeg|webp))"[^>]*>/i
      ) ??
      firstMatch(
        chunk,
        /<img[^>]+src="(https?:\/\/cdn\.paldb\.cc\/[^"]+PalIcon[^"]+\.(?:png|jpg|jpeg|webp))"[^>]*>/i
      ) ??
      firstMatch(chunk, /<img[^>]+src="(https?:\/\/cdn\.paldb\.cc\/[^"]+\.(?:png|jpg|jpeg|webp))"[^>]*>/i);

    const elementTitles: string[] = [];

    const elRe = /data-bs-title="([^"]+)"/gi;
    let em: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((em = elRe.exec(chunk))) {
      const t = (em[1] ?? "").trim();
      if (!t) continue;

      const low = t.toLowerCase();
      const isWork =
        low.includes("handiwork") ||
        low.includes("transporting") ||
        low.includes("farming") ||
        low.includes("gathering") ||
        low.includes("mining") ||
        low.includes("planting") ||
        low.includes("lumbering") ||
        low.includes("medicine") ||
        low.includes("kindling") ||
        low.includes("cooling") ||
        low.includes("watering") ||
        low.includes("generating");
      if (isWork) continue;

      elementTitles.push(t);
    }

    const chipEls = allMatches(
      chunk,
      /palstatus_element_[^>]*>[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/gi
    );
    elementTitles.push(...chipEls);

    const elements = dedup(elementTitles.map(cleanKey)).slice(0, 3);

    items.push({
      id: slug,
      name: cleanKey(name),
      number,
      numberRaw: normalizedRaw,
      url: absUrl(`/en/${slug}`),
      iconUrl: iconUrl ? absUrl(iconUrl) : null,
      elements,
    });

    seen.add(slug);
  }

  if (items.length === 0) {
    const linkRe = /<a[^>]+class="itemname"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let lm: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((lm = linkRe.exec(slice))) {
      const slug = (lm[1] ?? "").trim();
      const name = (lm[2] ?? "").trim();
      if (!slug || !name) continue;
      if (slug.includes("/") || slug.startsWith("#")) continue;
      if (seen.has(slug)) continue;

      const win = slice.slice(lm.index, Math.min(lm.index + 900, slice.length));
      const numberRaw2 = firstMatch(win, /#\s*([0-9]{1,4}[A-Za-z]?)/i) ?? "0";
      const { number, numberRaw: normalizedRaw } = parseNumberRawFromHash(numberRaw2);

      items.push({
        id: slug,
        name: cleanKey(name),
        number,
        numberRaw: normalizedRaw,
        url: absUrl(`/en/${slug}`),
        iconUrl: null,
        elements: [],
      });
      seen.add(slug);
    }
  }

  return items.sort((a, b) => {
    const an = a.number || 999999;
    const bn = b.number || 999999;
    if (an !== bn) return an - bn;

    const ar = a.numberRaw ?? "";
    const br = b.numberRaw ?? "";
    if (ar !== br) return ar.localeCompare(br);

    return a.name.localeCompare(b.name);
  });
}

export async function fetchPalList(): Promise<PalListItem[]> {
  const res = await fetch(`${BASE}/en/Pals`, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const html = await res.text();
  return parsePalListHtml(html);
}
