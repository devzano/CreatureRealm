// lib/api/pokeapi/ability.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type AbilityEffectEntry = {
  effect: string;
  short_effect: string;
  language: NamedAPIResource;
};

export type AbilityFlavorText = {
  flavor_text: string;
  language: NamedAPIResource;
  version_group: NamedAPIResource;
};

export type AbilityPokemonEntry = {
  is_hidden: boolean;
  slot: number;
  pokemon: NamedAPIResource;
};

export type Ability = {
  id: number;
  name: string;
  effect_entries: AbilityEffectEntry[];
  flavor_text_entries: AbilityFlavorText[];
  pokemon: AbilityPokemonEntry[];
};

/**
 * Detailed ability by id or name.
 * Used by the abilities bottom sheet for description and related Pokémon.
 */
export async function getAbility(
  idOrName: string | number
): Promise<Ability> {
  return fetchJson<Ability>(`/ability/${idOrName}`);
}
