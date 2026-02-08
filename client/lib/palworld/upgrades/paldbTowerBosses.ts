// lib/palworld/upgrades/paldbTowerBosses.ts
import { absUrl, BASE, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

export type TowerBossRow = {
  key: string; // stable key (slug + difficulty + level)
  slug: string; // href (relative)
  name: string;

  iconUrl: string | null;

  elements: string[]; // ["electric", "dark"]
  towerText: string | null; // e.g. "Tower of the Rayne Syndicate" or "Moonflower Tower"
  difficultyText: string | null; // "Normal" or "(Hard)" etc

  level: number | null;
  hp: number | null;
};

function captureAll(src: string, re: RegExp): string[][] {
  const s = String(src ?? "");
  if (!s) return [];
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rgx = new RegExp(re.source, flags);
  return Array.from(s.matchAll(rgx)).map((m) => Array.from(m));
}

function parseIntLoose(v: string | null | undefined): number | null {
  const s = String(v ?? "");
  const m = s.match(/([0-9][0-9,]*)/);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeElementName(v: string) {
  const s = cleanKey(v).toLowerCase();
  return s || v;
}

/**
 * Robustly splits the Tower page into individual boss tiles.
 * PalDB uses: <div class="col"><div class="d-flex border rounded"> ... </div></div>
 */
function splitTowerTiles(html: string): string[] {
  const src = String(html ?? "");
  if (!src) return [];

  // Prefer the most specific, stable delimiter
  const byCol = src
    .split(/<div\s+class="col"\s*>\s*<div\s+class="d-flex\s+border\s+rounded"\s*>/i)
    .slice(1)
    .map((x) => `<div class="d-flex border rounded">${x}`);

  if (byCol.length > 0) return byCol;

  // Fallback: less strict delimiter
  const byTile = src
    .split(/<div\s+class="d-flex\s+border\s+rounded"\s*>/i)
    .slice(1)
    .map((x) => `<div class="d-flex border rounded">${x}`);

  return byTile;
}

/**
 * Parses the /en/Tower page HTML.
 */
export function parseTowerBossesFromTowerPage(html: string): TowerBossRow[] {
  const src = String(html ?? "");
  if (!src) return [];

  const rawChunks = splitTowerTiles(src);
  const out: TowerBossRow[] = [];

  for (const chunk of rawChunks) {
    // href for detail page
    const href =
      firstMatch(chunk, /<a\b[^>]*\bhref="([^"]+)"/i) ??
      firstMatch(chunk, /<a\b[^>]*\bhref='([^']+)'/i) ??
      null;

    // Name from <a class="itemname">...</a>
    const nameInner =
      firstMatch(chunk, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ?? null;

    const name = cleanKey(htmlToText(nameInner ?? "")) || (href ? cleanKey(href) : "");
    if (!href || !name) continue;

    // size64 icon (first big icon)
    const iconSrc =
      firstMatch(chunk, /<img\b[^>]*class="[^"]*\bsize64\b[^"]*"[^>]*\bsrc="([^"]+)"/i) ??
      firstMatch(chunk, /<img\b[^>]*class='[^']*\bsize64\b[^']*'[^>]*\bsrc='([^']+)'/i) ??
      firstMatch(chunk, /<img\b[^>]*\bsrc="([^"]+)"[^>]*class="[^"]*\bsize64\b[^"]*"/i) ??
      null;

    const iconUrl = iconSrc ? absUrl(iconSrc) : null;

    // elements from tooltip titles: data-bs-title="Electric"
    const elementTitles = captureAll(chunk, /\bdata-bs-title="([^"]+)"/i)
      .map((m) => m[1] ?? "")
      .map(normalizeElementName)
      .filter(Boolean);

    /**
     * Tower line looks like:
     * <div>Moonflower Tower <span class="badge bg-info">Normal</span></div><div>Level: 55</div>
     * OR
     * <div>Tower of the Rayne Syndicate <span class="badge ...">(Hard)</span></div><div>Level: ...</div>
     *
     * So: capture the <div> immediately before "Level:" (any text, not just starting with "Tower").
     */
    const towerDivInner =
      firstMatch(chunk, /<div>\s*([\s\S]*?)\s*<\/div>\s*<div>\s*Level:/i) ??
      null;

    let towerText: string | null = null;
    let difficultyText: string | null = null;

    if (towerDivInner) {
      const badgeInner =
        firstMatch(
          towerDivInner,
          /<span\b[^>]*class="[^"]*\bbadge\b[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/span>/i
        ) ?? null;

      difficultyText = badgeInner ? cleanKey(htmlToText(badgeInner)) : null;

      const beforeSpan = firstMatch(towerDivInner, /^([\s\S]*?)<span\b/i) ?? null;
      towerText = cleanKey(htmlToText(beforeSpan ?? towerDivInner)) || null;

      if (difficultyText && towerText?.includes(difficultyText)) {
        towerText = cleanKey(towerText.replace(difficultyText, ""));
      }
    }

    const level = parseIntLoose(firstMatch(chunk, /\bLevel:\s*([0-9][0-9,]*)/i)) ?? null;
    const hp = parseIntLoose(firstMatch(chunk, /\bHp:\s*([0-9][0-9,]*)/i)) ?? null;

    // Keep slug as the raw href cleaned (matches your current usage patterns)
    const slug = cleanKey(href);

    // Stable key: href + difficulty + level (so Normal/Hard both exist)
    const key = cleanKey(`${slug}__${difficultyText ?? ""}__${level ?? ""}`);

    out.push({
      key,
      slug,
      name,
      iconUrl,
      elements: Array.from(new Set(elementTitles)),
      towerText,
      difficultyText,
      level,
      hp,
    });
  }

  // Dedup (same boss appears Normal/Hard; keep both via key)
  const map = new Map<string, TowerBossRow>();
  for (const row of out) {
    if (!map.has(row.key)) map.set(row.key, row);
  }
  return Array.from(map.values());
}

/**
 * Fetch + parse the tower bosses index.
 */
export async function fetchTowerBosses(): Promise<TowerBossRow[]> {
  const url = `${BASE}/en/Tower`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchTowerBosses failed: ${res.status}`);
  const html = await res.text();
  return parseTowerBossesFromTowerPage(html);
}
