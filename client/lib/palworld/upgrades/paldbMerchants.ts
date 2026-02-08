// lib/palworld/paldbMerchants.ts
//
// Parses https://paldb.cc/en/Merchant HTML into structured merchant/shop inventory rows.
// No DOM dependency required (regex-based) so it works in RN, Node, etc.

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

export type MerchantOfferRow = {
  merchantName: string;         // "Wandering Merchant"
  merchantCount: number | null; // from "Wandering Merchant /318" => 318

  // Item
  itemName: string;             // visible name in <a>
  itemSlug: string;             // href="Pal_Sphere" => "Pal_Sphere"
  iconUrl: string | null;       // img src
  hoverRef: string | null;      // data-hover attribute (sometimes "?s=Items%2F...")

  quantity: number | null;      // <small class="itemQuantity">1</small>
  stock: number | null;         // parses "Stock: 500" if present

  // Pricing
  price: number | null;         // from price <td>, if numeric

  // PalDB shop grouping id (LAST column)
  shopId: string;               // e.g. "Village_Shop_1" or "Vagrant_Trader_1_1"
};

export type MerchantBlock = {
  merchantName: string;
  merchantCount: number | null;
  offers: MerchantOfferRow[];
};

const MERCHANT_URL = "https://paldb.cc/en/Merchant";

function safeStr(v: any): string {
  return cleanKey(String(v ?? ""));
}

function safeNum(v: any): number | null {
  const s = safeStr(v);
  if (!s) return null;

  // allow commas: "1,200"
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseHeader(headerHtml: string): { name: string; count: number | null } {
  const text = safeStr(htmlToText(headerHtml ?? ""));
  // Examples:
  // "Wandering Merchant /318"
  // "Wandering Merchant / 318"
  const m = text.match(/^(.+?)(?:\s*\/\s*(\d+))?\s*$/);
  if (!m) return { name: text || "Merchant", count: null };

  const name = safeStr(m[1] ?? "") || "Merchant";
  const count = m[2] ? safeNum(m[2]) : null;

  return { name, count };
}

function parseStockFromText(text: string): number | null {
  const s = safeStr(text);
  const m = s.match(/\bstock\s*:\s*([0-9][0-9,]*)\b/i);
  return m ? safeNum(m[1]) : null;
}

function parseQuantityFromItemCell(itemCellHtml: string): number | null {
  const q =
    firstMatch(
      itemCellHtml,
      /<small[^>]*class=["'][^"']*\bitemQuantity\b[^"']*["'][^>]*>\s*([^<]+)\s*<\/small>/i
    ) ??
    firstMatch(
      itemCellHtml,
      /<small[^>]*class=['"][^'"]*\bitemQuantity\b[^'"]*['"][^>]*>\s*([^<]+)\s*<\/small>/i
    );

  return q ? safeNum(q) : null;
}

function parseItemAnchor(itemCellHtml: string) {
  // Prefer anchor with itemname class
  const aHtml =
    firstMatch(itemCellHtml, /(<a[^>]*class=["'][^"']*\bitemname\b[^"']*["'][\s\S]*?<\/a>)/i) ??
    firstMatch(itemCellHtml, /(<a[^>]*>[\s\S]*?<\/a>)/i);

  if (!aHtml) {
    const fallbackName = safeStr(htmlToText(itemCellHtml));
    return {
      itemSlug: "",
      itemName: fallbackName || "",
      iconUrl: null as string | null,
      hoverRef: null as string | null,
    };
  }

  const href = firstMatch(aHtml, /\bhref=["']([^"']+)["']/i) ?? "";
  const hoverRef = firstMatch(aHtml, /\bdata-hover=["']([^"']+)["']/i);
  const imgSrc =
    firstMatch(aHtml, /\bsrc=["']([^"']+)["']/i) ??
    firstMatch(aHtml, /\bdata-src=["']([^"']+)["']/i) ??
    null;

  const itemName = safeStr(htmlToText(aHtml));

  return {
    itemSlug: safeStr(href),
    itemName: safeStr(itemName),
    iconUrl: imgSrc ? absUrl(imgSrc) : null,
    hoverRef: hoverRef ? safeStr(hoverRef) : null,
  };
}

function splitLooseRows(tableOrChunkHtml: string): string[] {
  const s = String(tableOrChunkHtml ?? "");
  if (!s) return [];
  return Array.from(s.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tbody\b|<\/table\b|$)/gi)).map((m) => m[1] ?? "");
}

function splitLooseTds(trInnerHtml: string): string[] {
  const s = String(trInnerHtml ?? "");
  if (!s) return [];
  return Array.from(s.matchAll(/<td\b[^>]*>([\s\S]*?)(?=<td\b|<\/tr\b|$)/gi)).map((m) => m[1] ?? "");
}

export function parsePaldbMerchantPageHtml(html: string): MerchantBlock[] {
  const src = String(html ?? "");
  if (!src.trim()) return [];

  const headerRe = /<div\s+[^>]*class=["'][^"']*\bcard-header\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  const headers = Array.from(src.matchAll(headerRe));
  if (!headers.length) return [];

  const blocks: MerchantBlock[] = [];

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const headerInner = h[1] ?? "";
    const start = typeof h.index === "number" ? h.index : 0;
    const end = i + 1 < headers.length && typeof headers[i + 1].index === "number" ? (headers[i + 1].index as number) : src.length;

    const chunk = src.slice(start, end);

    const tableHtml = firstMatch(chunk, /<table\b[\s\S]*?<\/table>/i);
    if (!tableHtml) continue;

    const { name: merchantName, count: merchantCount } = parseHeader(headerInner);

    const offers: MerchantOfferRow[] = [];

    const rows = splitLooseRows(tableHtml);
    for (const rowInner of rows) {
      if (/<th\b/i.test(rowInner)) continue;

      const tds = splitLooseTds(rowInner);
      if (tds.length < 3) continue;

      const itemCell = tds[0] ?? "";
      const priceCellText = safeStr(htmlToText(tds[1] ?? ""));

      const stockFromTd = tds.length >= 4 ? parseStockFromText(htmlToText(tds[2] ?? "")) : null;
      const stockFromItem = parseStockFromText(htmlToText(itemCell));
      const stock = stockFromTd ?? stockFromItem;

      const idCellText = safeStr(htmlToText(tds[tds.length - 1] ?? ""));
      const shopId = safeStr(idCellText);
      if (!shopId) continue;

      const { itemSlug, itemName, iconUrl, hoverRef } = parseItemAnchor(itemCell);
      const quantity = parseQuantityFromItemCell(itemCell);
      const price = safeNum(priceCellText);

      offers.push({
        merchantName,
        merchantCount,
        itemName,
        itemSlug,
        iconUrl,
        hoverRef,
        quantity,
        stock,
        price,
        shopId,
      });
    }

    if (!offers.length) continue;

    const seenOffer = new Set<string>();
    const dedupOffers: MerchantOfferRow[] = [];
    for (const o of offers) {
      const key = [
        o.merchantName,
        o.merchantCount ?? "",
        o.shopId,
        o.itemSlug,
        o.itemName,
        o.price ?? "",
        o.quantity ?? "",
        o.stock ?? "",
      ].join("||");

      if (seenOffer.has(key)) continue;
      seenOffer.add(key);
      dedupOffers.push(o);
    }

    blocks.push({ merchantName, merchantCount, offers: dedupOffers });
  }

  const seenBlock = new Set<string>();
  const out: MerchantBlock[] = [];
  for (const b of blocks) {
    const key = `${b.merchantName}__${b.merchantCount ?? ""}`;
    if (seenBlock.has(key)) continue;
    seenBlock.add(key);
    out.push(b);
  }

  return out;
}

export function parsePaldbMerchantOffers(html: string): MerchantOfferRow[] {
  const blocks = parsePaldbMerchantPageHtml(html);
  return blocks.flatMap((b) => b.offers);
}

export async function fetchMerchantOffers(): Promise<MerchantOfferRow[]> {
  const res = await fetch(MERCHANT_URL, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`paldbMerchants: HTTP ${res.status} fetching ${MERCHANT_URL}`);
  }

  const html = await res.text();
  return parsePaldbMerchantOffers(html);
}

export async function fetchMerchantBlocks(): Promise<MerchantBlock[]> {
  const res = await fetch(MERCHANT_URL, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`paldbMerchants: HTTP ${res.status} fetching ${MERCHANT_URL}`);
  }

  const html = await res.text();
  return parsePaldbMerchantPageHtml(html);
}
