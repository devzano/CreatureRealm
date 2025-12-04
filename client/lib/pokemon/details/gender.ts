// lib/api/pokeapi/gender.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type PokemonSpeciesGender = {
  rate: number; // -1 for genderless, otherwise 0–8
  pokemon_species: NamedAPIResource;
};

export type Gender = {
  id: number;
  name: string; // "male" | "female" | "genderless"
  pokemon_species_details: PokemonSpeciesGender[];
  required_for_evolution: NamedAPIResource[];
};

/**
 * https://pokeapi.co/api/v2/gender/{id or name}/
 */
export async function getGender(idOrName: string | number): Promise<Gender> {
  return fetchJson<Gender>(`/gender/${idOrName}`);
}
