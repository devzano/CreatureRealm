// lib/api/pokeapi/move.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type MoveMeta = {
  ailment: NamedAPIResource;
  category: NamedAPIResource;
  crit_rate: number;
  drain: number;
  healing: number;
  max_hits: number | null;
  max_turns: number | null;
  min_hits: number | null;
  min_turns: number | null;
  stat_chance: number;
};

export type VerboseEffect = {
  effect: string;
  short_effect: string;
  language: NamedAPIResource;
};

export type MoveDamageClassRef = NamedAPIResource;

export type Move = {
  id: number;
  name: string;
  type: NamedAPIResource;
  accuracy: number | null;
  pp: number | null;
  power: number | null;
  priority: number;
  damage_class: MoveDamageClassRef;
  effect_chance: number | null;
  effect_entries: VerboseEffect[];
  meta?: MoveMeta;
};

/**
 * Detailed move by id or name.
 * Used by the moves bottom sheet for filters (type, category, priority, etc.).
 */
export async function getMove(idOrName: string | number): Promise<Move> {
  return fetchJson<Move>(`/move/${idOrName}`);
}

// pokeapi-safe
export async function safeGetMove(
  idOrName: string | number
): Promise<Move | null> {
  try {
    return await getMove(idOrName);
  } catch (err) {
    console.warn(`Failed to fetch move ${idOrName}`, err);
    return null;
  }
}

/**
 * Detailed move by full PokéAPI URL.
 * Useful when we already have "move.url" from a Pokémon's moves list.
 */
export async function getMoveByUrl(url: string): Promise<Move> {
  return fetchJson<Move>(url);
}
