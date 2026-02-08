// components/Palworld/palGridKit.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function safeText(v: any): string {
  return String(v ?? "").trim();
}

export function safeName(x: any): string {
  const s = safeText(x?.name);
  return s || "Unknown";
}

export function formatPillNumber(v: any): string {
  const n = safeNum(v);
  if (n == null) return "—";

  const abs = Math.abs(n);
  if (abs < 1000) {
    const isInt = Math.abs(n - Math.trunc(n)) < 1e-9;
    return isInt ? String(Math.trunc(n)) : String(Number(n.toFixed(2)));
  }

  const k = n / 1000;
  const txt = Math.abs(k) >= 10 ? k.toFixed(0) : k.toFixed(1);
  return `${txt.replace(/\.0$/, "")}k`;
}

/** Signed number for sheet pills like SAN/Healing */
export function formatSigned(v: any): string {
  const n = safeNum(v);
  if (n == null) return "—";
  const txt = Math.abs(n) < 10 ? Number(n.toFixed(2)).toString() : Number(n.toFixed(1)).toString();
  return txt;
}

/** + sign formatting for SAN-like values */
export function formatSan(v: any): string {
  const n = safeNum(v);
  if (n == null) return "—";
  const fixed = n.toFixed(2);
  const cleaned = fixed.replace(/\.00$/, "");
  return n > 0 ? `+${cleaned}` : cleaned;
}

export function makeStripTrailingSuffix(suffixRegex: RegExp) {
  return (name: string) => {
    const s = String(name ?? "").replace(/\s+/g, " ").trim();
    if (!s) return s;
    return s.replace(suffixRegex, "").trim();
  };
}

export function buildTwoLineTitle(
  nameRaw: string,
  categoryText: string | null | undefined,
  opts: { strip?: (s: string) => string; fallback1: string; fallback2: string }
) {
  const base = (opts.strip ? opts.strip(nameRaw) : String(nameRaw ?? "")).trim();
  const line1 = base || opts.fallback1;
  const line2 = safeText(categoryText) || opts.fallback2;
  return { line1, line2 };
}

/** Prefetch icon urls (no-op if disabled) */
export function usePrefetchIcons(prefetchIcons: boolean, iconUrls: Array<string | null | undefined>) {
  useEffect(() => {
    if (!prefetchIcons) return;
    const list = iconUrls.map((u) => String(u ?? "").trim()).filter(Boolean);
    if (!list.length) return;
    prefetchRemoteIcons(list);
  }, [prefetchIcons, iconUrls]);
}

/** Shared detail-sheet behavior: cache + loading + error */
export function useDetailSheet<TIndex extends { slug?: any }, TDetail>(
  fetcher: (slug: string) => Promise<TDetail>,
  onPressItem?: (item: TIndex) => void
) {
  const cacheRef = useRef<Map<string, TDetail>>(new Map());

  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<TIndex | null>(null);

  const [detail, setDetail] = useState<TDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => setVisible(false), []);

  const open = useCallback(
    async (it: TIndex) => {
      onPressItem?.(it);

      setSelected(it);
      setVisible(true);
      setError(null);

      const key = String((it as any)?.slug ?? "").trim();
      if (!key) return;

      const cached = cacheRef.current.get(key);
      if (cached) {
        setDetail(cached);
        return;
      }

      setDetail(null);
      setLoading(true);
      try {
        const d = await fetcher(key);
        cacheRef.current.set(key, d);
        setDetail(d);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Failed to load details.");
      } finally {
        setLoading(false);
      }
    },
    [fetcher, onPressItem]
  );

  return {
    cacheRef,
    visible,
    open,
    close,
    selected,
    detail,
    loading,
    error,
    setError,
  };
}
