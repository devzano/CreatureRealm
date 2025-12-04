// lib/pokemon/pokeapi/base.ts

export const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

/**
 * Generic "named resource" reference used all over PokeAPI.
 * e.g. { name: "fire", url: "https://pokeapi.co/api/v2/type/10/" }
 */
export type NamedAPIResource = {
  name: string;
  url: string;
};

// --- Generic fetch helper ---

export async function fetchJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${POKEAPI_BASE_URL}${path}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`PokéAPI error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

/**
 * Helper to derive an ID from a PokéAPI URL.
 * e.g. "https://pokeapi.co/api/v2/pokemon/25/" -> 25
 *      "https://pokeapi.co/api/v2/pokemon-species/25/" -> 25
 */
export function extractPokemonIdFromUrl(url: string): number | null {
  const parts = url.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const id = Number(last);
  return Number.isNaN(id) ? null : id;
}
