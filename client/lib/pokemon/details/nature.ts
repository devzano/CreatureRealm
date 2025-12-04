// lib/api/pokeapi/nature.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type NatureStatChange = {
  max_change: number;
  pokeathlon_stat: NamedAPIResource;
};

export type MoveBattleStylePreference = {
  low_hp_preference: number;
  high_hp_preference: number;
  move_battle_style: NamedAPIResource;
};

export type Nature = {
  id: number;
  name: string;
  decreased_stat: NamedAPIResource | null;
  increased_stat: NamedAPIResource | null;
  hates_flavor: NamedAPIResource | null;
  likes_flavor: NamedAPIResource | null;
  pokeathlon_stat_changes: NatureStatChange[];
  move_battle_style_preferences: MoveBattleStylePreference[];
};

/**
 * https://pokeapi.co/api/v2/nature/{id or name}/
 */
export async function getNature(
  idOrName: string | number
): Promise<Nature> {
  return fetchJson<Nature>(`/nature/${idOrName}`);
}
