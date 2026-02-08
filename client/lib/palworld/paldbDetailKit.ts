// lib/palworld/paldbDetailKit.ts
//
// Shared PalDB detail parsing kit (Sphere/Ammo/others parity)
// - Centralizes the “card section” parsers so fixes apply everywhere.
// - Designed to be imported by paldbSpheres.ts, paldbAmmo.ts, etc.
//
// Depends on your existing primitives from palworldDB:
//   absUrl, cleanKey, firstMatch, htmlToText
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

// -----------------------------
// Shared Types
// -----------------------------

export type DetailItemRef = {
  slug: string;
  name: string;
  iconUrl: string | null;
};

export type DetailIngredient = DetailItemRef & {
  qty: number | null;
  qtyText?: string | null;
};

export type DetailRecipeRow = {
  materials: DetailIngredient[];
  product: DetailIngredient | null;
  schematicText: string | null;
};

export type TreantNode = {
  slug: string | null;
  name: string | null;
  iconUrl: string | null;
  qty: number | null;
  children: TreantNode[];
};

export type DroppedByRow = {
  pal: DetailItemRef | null;
  qtyText: string | null;
  probabilityText: string | null;
};

export type TreasureBoxRow = {
  item: DetailItemRef | null;
  qtyText: string | null;
  sourceText: string | null;
};

export type MerchantRow = {
  item: DetailItemRef | null;
  sourceText: string | null;
};

export type KeyValueRow = {
  key: string;
  valueText: string | null;
  keyItem: { slug: string; name: string; iconUrl: string | null; } | null;
  valueItem: { slug: string; name: string; iconUrl: string | null; } | null;
  keyIconUrl?: string | null;
};

export type ResearchRow = {
  materials: DetailIngredient[];
  productText: string | null;
};

export type SoulUpgradeRow = {
  material: DetailItemRef | null;
  qty: number | null;
  qtyText: string | null;     // e.g. "x3"
  rankText: string | null;    // e.g. "Rank 14"
};

// -----------------------------
// URL helper
// -----------------------------

export function normalizeDetailHref(slugOrHref: string) {
  const raw = String(slugOrHref ?? "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/en/")) return absUrl(raw);
  if (!raw.startsWith("/")) return absUrl(`/en/${raw}`);
  return absUrl(`/en${raw}`);
}

// -----------------------------
// Internals: match/capture + HTML entity decode
// -----------------------------

function captureAll(src: string, re: RegExp): string[][] {
  const s = String(src ?? "");
  if (!s) return [];
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rgx = new RegExp(re.source, flags);
  return Array.from(s.matchAll(rgx)).map((m) => Array.from(m));
}

function decodeHtmlEntities(s: string) {
  return String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&#60;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#62;/g, ">");
}

// -----------------------------
// Treant parser
// -----------------------------

export function parseTreantTreeFromPage(src: string): TreantNode | null {
  const rawAttr =
    firstMatch(src, /\bdata-treant="([\s\S]*?)"/i) ?? firstMatch(src, /\bdata-treant='([\s\S]*?)'/i);

  if (!rawAttr) return null;

  let jsonText = decodeHtmlEntities(rawAttr).trim();
  if (!jsonText) return null;

  let obj: any = null;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    return null;
  }

  function asQty(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function slugToDisplayName(slug: string | null): string | null {
    const s = String(slug ?? "").trim();
    if (!s) return null;

    const last = s.split("/").filter(Boolean).slice(-1)[0] ?? s;
    const base = last.replace(/[#?].*$/, "");

    const decoded = (() => {
      try {
        return decodeURIComponent(base);
      } catch {
        return base;
      }
    })();

    const name = decoded.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    return name ? name : null;
  }

  function walk(n: any): TreantNode {
    const linkHref =
      n?.link?.href != null ? String(n.link.href) : n?.link?.url != null ? String(n.link.url) : null;

    const image = n?.image != null ? String(n.image) : null;

    const qty = asQty(n?.text?.name);

    const slug = linkHref ? cleanKey(linkHref) : null;

    return {
      slug,
      name: slugToDisplayName(slug),
      iconUrl: image ? absUrl(image) : null,
      qty,
      children: Array.isArray(n?.children) ? n.children.map(walk) : [],
    };
  }

  return walk(obj);
}

// -----------------------------
// Card extraction helpers
// -----------------------------

export function extractCardByTitle(src: string, titleNeedleLower: string): string | null {
  const s = String(src ?? "");
  if (!s) return null;

  const parts = s.split(/<div class="card mt-3">/i).slice(1);
  for (const raw of parts) {
    const card = `<div class="card mt-3">${raw}`;

    const h5Inner =
      firstMatch(
        card,
        /<h5\b[^>]*class=(?:"[^"]*\bcard-title\b[^"]*"|'[^']*\bcard-title\b[^']*')[^>]*>\s*([\s\S]*?)\s*<\/h5>/i
      ) ?? null;

    const title = cleanKey(htmlToText(h5Inner ?? "")).toLowerCase();
    if (!title) continue;

    if (title.includes(titleNeedleLower)) {
      return card;
    }
  }

  return null;
}

// -----------------------------
// Foods card (Nutrition/SAN/Corruption etc.)
// -----------------------------

export function parseFoodsCardRowsFromPage(src: string): KeyValueRow[] {
  const card = extractCardByTitle(src, "foods");
  if (!card) return [];
  return parseKeyValueRows(card);
}

export function extractFirstMb0TableHtml(block: string): string | null {
  const s = String(block ?? "");
  if (!s) return null;

  return (
    firstMatch(
      s,
      /(<table\b[^>]*class=(?:"[^"]*\btable\b[^"]*\bmb-0\b[^"]*"|'[^']*\btable\b[^']*\bmb-0\b[^']*')[\s\S]*?<\/table>)/i
    ) ?? null
  );
}

function parseFirstImgSrc(html: string): string | null {
  const m = String(html ?? "").match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return m?.[1] ? String(m[1]).trim() : null;
}

// -----------------------------
// Key/Value rows (Stats/Others)
// -----------------------------

export function parseKeyValueRows(cardHtml: string): KeyValueRow[] {
  const src = String(cardHtml ?? "");
  if (!src) return [];

  const rowMatches = Array.from(
    src.matchAll(
      /<div\b[^>]*class=(?:"[^"]*\bd-flex\b[^"]*\bjustify-content-between\b[^"]*"|'[^']*\bd-flex\b[^']*\bjustify-content-between\b[^']*')[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    )
  );

  const out: KeyValueRow[] = [];

  for (const m of rowMatches) {
    const keyHtml = m[1] ?? "";
    const valueHtml = m[2] ?? "";

    const keyItem = parseFirstItemLink(keyHtml);
    const keyTextRaw = cleanKey(htmlToText(keyHtml));
    const key = cleanKey(keyItem?.name ?? keyTextRaw);

    const keyIconUrl = keyItem?.iconUrl ?? parseFirstImgSrc(keyHtml) ?? null;

    const valueItem = parseFirstItemLink(valueHtml);
    const valueText = cleanKey(htmlToText(valueHtml)) || null;

    if (!key) continue;

    out.push({
      key,
      keyItem: keyItem ?? null,
      keyIconUrl,
      valueText,
      valueItem: valueItem ?? null,
    });
  }

  return out;
}

// -----------------------------
// Item link list (Produced At)
// -----------------------------

export function parseItemLinks(html: string): DetailItemRef[] {
  const src = String(html ?? "");
  if (!src) return [];

  const matches = captureAll(
    src,
    /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*\bhref="([^"]+)"[^>]*>\s*([\s\S]*?)<\/a>/i
  );

  const out: DetailItemRef[] = [];
  for (const m of matches) {
    const href = m[1];
    const inner = m[2] ?? "";

    const icon =
      firstMatch(inner, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(inner, /<img\b[^>]*\bsrc='([^']+)'/i) ?? null;

    const text = cleanKey(htmlToText(inner));
    if (!href) continue;

    out.push({
      slug: cleanKey(href),
      name: cleanKey(text || href),
      iconUrl: icon ? absUrl(icon) : null,
    });
  }

  const map = new Map<string, DetailItemRef>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Table parsing helpers (tolerant tbody)
// -----------------------------
// -----------------------------
// Shared: "item_skill_bar" helpers (Effects under Description)
// -----------------------------

export function stripItemSkillBarsFromHtml(html: string): string {
  const s = String(html ?? "");
  if (!s) return s;

  // Remove entire blocks
  return s.replace(
    /<div\b[^>]*class=(?:"[^"]*\bitem_skill_bar\b[^"]*"|'[^']*\bitem_skill_bar\b[^']*')[^>]*>[\s\S]*?<\/div>/gi,
    " "
  );
}

export function extractItemSkillBarsTextFromHtml(html: string): string[] {
  const s = String(html ?? "");
  if (!s) return [];

  const matches = captureAll(
    s,
    /<div\b[^>]*class=(?:"[^"]*\bitem_skill_bar\b[^"]*"|'[^']*\bitem_skill_bar\b[^']*')[^>]*>([\s\S]*?)<\/div>/i
  ).map((m) => m[1] ?? "");

  const out: string[] = [];
  for (const inner of matches) {
    const txt = cleanKey(htmlToText(inner));
    if (txt) out.push(txt);
  }

  // dedup while preserving order
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

function splitLooseRows(tbodyHtml: string): string[] {
  const s = String(tbodyHtml ?? "");
  if (!s) return [];

  return Array.from(s.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tbody\b|<\/table\b|$)/gi)).map((m) => m[1] ?? "");
}

function splitLooseTds(trInnerHtml: string): string[] {
  const s = String(trInnerHtml ?? "");
  if (!s) return [];

  return Array.from(s.matchAll(/<td\b[^>]*>([\s\S]*?)(?=<td\b|<\/tr\b|$)/gi)).map((m) => m[1] ?? "");
}

function extractTbodyInner(tableHtml: string): string {
  const s = String(tableHtml ?? "");
  if (!s) return "";

  const normal = firstMatch(s, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  if (normal != null) return normal;

  const startIdx = s.search(/<tbody\b/i);
  if (startIdx < 0) return "";

  const afterTbody = s.slice(startIdx);
  const openEnd = afterTbody.search(/>/);
  if (openEnd < 0) return "";

  const innerStart = startIdx + openEnd + 1;
  const rest = s.slice(innerStart);

  const stop = rest.search(/<\/table\b/i);
  return stop >= 0 ? rest.slice(0, stop) : rest;
}

// -----------------------------
// Recipe table
// -----------------------------

export function parseRecipeTable(tableHtml: string): DetailRecipeRow[] {
  const src = String(tableHtml ?? "");
  if (!src) return [];

  const tbody = extractTbodyInner(src);
  if (!tbody) return [];

  const rows = splitLooseRows(tbody);
  const out: DetailRecipeRow[] = [];

  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 2) continue;

    const materialsTd = tds[0] ?? "";
    const productTd = tds[1] ?? "";
    const schematicTd = tds[2] ?? "";

    const materials = parseMaterialsCell(materialsTd);
    const product = parseSingleCellItem(productTd);
    const schematicText = cleanKey(htmlToText(schematicTd)) || null;

    out.push({ materials, product, schematicText });
  }

  return out;
}

function parseMaterialsCell(tdHtml: string): DetailIngredient[] {
  const src = String(tdHtml ?? "");
  if (!src) return [];

  const out: DetailIngredient[] = [];

  const spans = captureAll(src, /<span>([\s\S]*?)<\/span>/i).map((m) => m[1] ?? "");

  for (const span of spans) {
    const hasLink = /\bitemname\b/i.test(span) && /\bhref=/i.test(span);

    if (hasLink) {
      const href = firstMatch(span, /\bhref="([^"]+)"/i) ?? firstMatch(span, /\bhref='([^']+)'/i) ?? null;

      const icon =
        firstMatch(span, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(span, /<img\b[^>]*\bsrc='([^']+)'/i) ?? null;

      const name =
        firstMatch(span, /<\/img>\s*([^<]+?)\s*<\/a>/i) ??
        firstMatch(span, /\/>\s*([^<]+?)\s*<\/a>/i) ??
        cleanKey(htmlToText(span));

      const qtyText =
        firstMatch(span, /<small\b[^>]*class="itemQuantity"[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
        firstMatch(span, /<small\b[^>]*class='itemQuantity'[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
        null;

      const { qty, raw } = parseQtyText(qtyText);

      if (href) {
        out.push({
          slug: cleanKey(href),
          name: cleanKey(name || href),
          iconUrl: icon ? absUrl(icon) : null,
          qty,
          qtyText: raw,
        });
      }
      continue;
    }

    // Work icon row (PalDB uses a special icon in materials list)
    const workIcon =
      firstMatch(span, /<img\b[^>]*\bsrc="([^"]*T_icon_status_05[^"]*)"/i) ??
      firstMatch(span, /<img\b[^>]*\bsrc='([^']*T_icon_status_05[^']*)'/i) ??
      null;

    if (workIcon) {
      const qtyText =
        firstMatch(span, /<small\b[^>]*class="itemQuantity"[^>]*>[\s\S]*?([0-9][0-9,]*)[\s\S]*?<\/small>/i) ?? null;

      const { qty, raw } = parseQtyText(qtyText);

      out.push({
        slug: "__work__",
        name: "Work",
        iconUrl: absUrl(workIcon),
        qty,
        qtyText: raw,
      });
    }
  }

  const map = new Map<string, DetailIngredient>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

function parseSingleCellItem(tdHtml: string): DetailIngredient | null {
  const src = String(tdHtml ?? "");
  if (!src) return null;

  const href = firstMatch(src, /\bhref="([^"]+)"/i) ?? firstMatch(src, /\bhref='([^']+)'/i) ?? null;
  if (!href) return null;

  const icon =
    firstMatch(src, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(src, /<img\b[^>]*\bsrc='([^']+)'/i) ?? null;

  const name =
    firstMatch(src, /<\/img>\s*([^<]+?)\s*<\/a>/i) ??
    firstMatch(src, /\/>\s*([^<]+?)\s*<\/a>/i) ??
    cleanKey(htmlToText(src));

  const qtyText =
    firstMatch(src, /<small\b[^>]*class="itemQuantity"[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
    firstMatch(src, /<small\b[^>]*class='itemQuantity'[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
    null;

  const { qty, raw } = parseQtyText(qtyText);

  return {
    slug: cleanKey(href),
    name: cleanKey(name || href),
    iconUrl: icon ? absUrl(icon) : null,
    qty,
    qtyText: raw,
  };
}

function parseQtyText(qtyText: string | null | undefined): { qty: number | null; raw: string | null; } {
  const raw = qtyText != null ? cleanKey(String(qtyText)) : null;
  if (!raw) return { qty: null, raw: null };

  const m = raw.match(/([0-9][0-9,]*)/);
  if (!m) return { qty: null, raw };

  const n = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? { qty: n, raw } : { qty: null, raw };
}

// -----------------------------
// Shared: filter out "Work" pseudo-ingredient from recipe rows
// -----------------------------

export function isWorkIngredient(m: any) {
  const slug = String(m?.slug ?? "");
  if (slug === "__work__") return true;

  const icon = String(m?.iconUrl ?? "");
  return icon.includes("T_icon_status_05");
}

/**
 * Removes the special PalDB "Work" ingredient rows from recipe materials.
 * - Keeps row if it still has materials OR has a product OR has schematicText
 * - Works across different DetailRecipeRow shapes (Armor/Accessory/etc.)
 */
export function filterOutWorkFromRecipeRows<
  T extends { materials?: any[]; product?: any; schematicText?: any }
>(rows: T[]): T[] {
  const arr = Array.isArray(rows) ? rows : [];

  return arr
    .map((row) => {
      const mats = Array.isArray(row?.materials) ? row.materials : [];
      const filtered = mats.filter((m) => !isWorkIngredient(m));
      return { ...row, materials: filtered };
    })
    .filter((row) => (row.materials?.length ?? 0) > 0 || row.product != null || !!row.schematicText);
}

// -----------------------------
// Dropped By table
// -----------------------------

export function parseDroppedByTable(tableHtml: string): DroppedByRow[] {
  const src = String(tableHtml ?? "");
  if (!src) return [];

  const tbody = extractTbodyInner(src);
  if (!tbody) return [];

  const rows = splitLooseRows(tbody);
  const out: DroppedByRow[] = [];

  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 3) continue;

    const palTd = tds[0] ?? "";
    const qtyTd = tds[1] ?? "";
    const probTd = tds[2] ?? "";

    const pal = parseFirstItemLink(palTd);
    const qtyText = cleanKey(htmlToText(qtyTd)) || null;
    const probabilityText = cleanKey(htmlToText(probTd)) || null;

    out.push({ pal, qtyText, probabilityText });
  }

  return out;
}

function normalizeLooseText(v: string | null | undefined): string | null {
  const s0 = String(v ?? "");
  if (!s0) return null;

  const withDash = s0.replace(/&ndash;|&#8211;|&#x2013;/gi, " – ");

  const noUnderscore = withDash.replace(/_/g, " ");

  const s = cleanKey(noUnderscore).replace(/\s+/g, " ").trim();

  return s ? s : null;
}

function normalizedCellText(html: string): string | null {
  return normalizeLooseText(htmlToText(String(html ?? "")));
}

export function parseTreasureBoxTable(tableHtml: string): TreasureBoxRow[] {
  const src = String(tableHtml ?? "");
  if (!src) return [];

  const tbody = extractTbodyInner(src);
  if (!tbody) return [];

  const rows = splitLooseRows(tbody);
  const out: TreasureBoxRow[] = [];

  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 2) continue;

    const itemTd = tds[0] ?? "";
    const sourceTd = tds[1] ?? "";

    const item = parseFirstItemLink(itemTd);

    const qtyText =
      firstMatch(itemTd, /<small\b[^>]*class="itemQuantity"[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
      firstMatch(itemTd, /<small\b[^>]*class='itemQuantity'[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
      null;

    const sourceText = normalizedCellText(sourceTd);

    out.push({
      item,
      qtyText: qtyText ? normalizeLooseText(qtyText) : null,
      sourceText,
    });
  }

  return out;
}

// -----------------------------
// Wandering Merchant table (UPDATED)
// -----------------------------

export function parseMerchantTable(tableHtml: string): MerchantRow[] {
  const src = String(tableHtml ?? "");
  if (!src) return [];

  const tbody = extractTbodyInner(src);
  if (!tbody) return [];

  const rows = splitLooseRows(tbody);
  const out: MerchantRow[] = [];

  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 2) continue;

    const itemTd = tds[0] ?? "";
    const sourceTd = tds[1] ?? "";

    const item = parseFirstItemLink(itemTd);

    const sourceText = normalizedCellText(sourceTd);

    out.push({ item, sourceText });
  }

  return out;
}

export function parseResearchTable(tableHtml: string): ResearchRow[] {
  const src = String(tableHtml ?? "");
  if (!src) return [];

  const tbody = extractTbodyInner(src);
  if (!tbody) return [];

  const rows = splitLooseRows(tbody);
  const out: ResearchRow[] = [];

  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 2) continue;

    const materialsTd = tds[0] ?? "";
    const productTd = tds[1] ?? "";

    const materials = parseResearchMaterialsTd(materialsTd);
    const productText = cleanKey(htmlToText(productTd)) || null;

    // keep even if empty, but usually skip totally empty rows
    if (!materials.length && !productText) continue;

    out.push({ materials, productText });
  }

  return out;
}

function parseResearchMaterialsTd(tdHtml: string): DetailIngredient[] {
  const src = String(tdHtml ?? "");
  if (!src) return [];

  // This table packs: <a class="itemname" href="...">...Name...</a> <small class="itemQuantity">10</small>
  // repeated multiple times inside the same <td>.
  const links = captureAll(
    src,
    /<a\b[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/i
  );

  const out: DetailIngredient[] = [];

  for (const m of links) {
    const href = (m[1] ?? m[2] ?? "").trim();
    const inner = m[3] ?? "";

    if (!href) continue;

    const icon =
      firstMatch(inner, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
      firstMatch(inner, /<img\b[^>]*\bsrc='([^']+)'/i) ??
      null;

    const name = cleanKey(htmlToText(inner)) || cleanKey(href);

    // Find the FIRST itemQuantity that appears right after this </a>
    // by scanning the substring following the end of this anchor tag.
    const anchorHtml = m[0] ?? "";
    const idx = src.indexOf(anchorHtml);
    let qtyText: string | null = null;

    if (idx >= 0) {
      const after = src.slice(idx + anchorHtml.length);
      qtyText =
        firstMatch(after, /<small\b[^>]*class="itemQuantity"[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
        firstMatch(after, /<small\b[^>]*class='itemQuantity'[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
        null;
    }

    const { qty, raw } = parseQtyText(qtyText);

    out.push({
      slug: cleanKey(href),
      name: cleanKey(name),
      iconUrl: icon ? absUrl(icon) : null,
      qty,
      qtyText: raw,
    });
  }

  // dedupe by slug
  const map = new Map<string, DetailIngredient>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

export function parseSoulUpgradeCardRowsFromPage(src: string): SoulUpgradeRow[] {
  // Title can be English ("Soul Upgrade") or TW ("帕魯強化") on the same card.
  // Your extractCardByTitle() matches by LOWERCASED htmlToText() of the <h5>.
  const card =
    extractCardByTitle(src, "soul upgrade") ??
    extractCardByTitle(src, "帕魯強化") ??
    extractCardByTitle(src, "pal upgrade") ??
    null;

  if (!card) return [];

  const table = extractFirstMb0TableHtml(card);
  if (!table) return [];

  return parseSoulUpgradeTable(table);
}

function parseSoulUpgradeTable(tableHtml: string): SoulUpgradeRow[] {
  const src = String(tableHtml ?? "");
  if (!src) return [];

  const tbody = extractTbodyInner(src);
  if (!tbody) return [];

  const rows = splitLooseRows(tbody);
  const out: SoulUpgradeRow[] = [];

  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 2) continue;

    const materialTd = tds[0] ?? "";
    const rankTd = tds[1] ?? "";

    const material = parseFirstItemLink(materialTd);

    // Example material cell text:
    // "Giant Pal Soul x3"
    const materialText = cleanKey(htmlToText(materialTd));
    const { qty, qtyText } = parseInlineXQty(materialText);

    const rankText = cleanKey(htmlToText(rankTd)) || null;

    // Skip totally empty rows
    if (!material && !rankText && qty == null) continue;

    out.push({
      material,
      qty,
      qtyText,
      rankText,
    });
  }

  return out;
}

function parseInlineXQty(text: string | null | undefined): { qty: number | null; qtyText: string | null; } {
  const s = cleanKey(String(text ?? ""));
  if (!s) return { qty: null, qtyText: null };

  // Matches: "x1", "x 12", "X4"
  const m = s.match(/\bx\s*([0-9][0-9,]*)\b/i);
  if (!m) return { qty: null, qtyText: null };

  const raw = `x${m[1]}`;
  const n = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? { qty: n, qtyText: raw } : { qty: null, qtyText: raw };
}

// -----------------------------
// First item link helper (used across sections)
// -----------------------------

export function parseFirstItemLink(html: string): DetailItemRef | null {
  const src = String(html ?? "");
  if (!src) return null;

  const href = firstMatch(src, /\bhref="([^"]+)"/i) ?? firstMatch(src, /\bhref='([^']+)'/i) ?? null;
  if (!href) return null;

  const icon =
    firstMatch(src, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(src, /<img\b[^>]*\bsrc='([^']+)'/i) ?? null;

  const name =
    firstMatch(src, /<\/img>\s*([^<]+?)\s*<\/a>/i) ??
    firstMatch(src, /\/>\s*([^<]+?)\s*<\/a>/i) ??
    cleanKey(htmlToText(src));

  return {
    slug: cleanKey(href),
    name: cleanKey(name || href),
    iconUrl: icon ? absUrl(icon) : null,
  };
}
