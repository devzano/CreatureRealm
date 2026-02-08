// lib/pokemon/pokeapi/base.ts
export const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

export type NamedAPIResource = {
  name: string;
  url: string;
};

function normalizePath(path: string) {
  const p = String(path ?? "").trim();
  if (!p) return "/";

  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  return p.startsWith("/") ? p : `/${p}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const normalized = normalizePath(path);
  const url = normalized.startsWith("http") ? normalized : `${POKEAPI_BASE_URL}${normalized}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`PokéAPI error: ${res.status} ${res.statusText || ""} (${url})`.trim());
  }

  return (await res.json()) as T;
}

export function extractPokemonIdFromUrl(url: string): number | null {
  const parts = url.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const id = Number(last);
  return Number.isNaN(id) ? null : id;
}
