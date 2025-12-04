// lib/pokemon/pokeapi/generation.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type PokemonSpeciesListItem = NamedAPIResource;

export type Generation = {
  id: number;
  name: string;
  pokemon_species: PokemonSpeciesListItem[];
};

/**
 * Fetch Pokémon species belonging to a generation (Gen 1–9).
 */
export async function getGeneration(
  idOrName: number | string
): Promise<Generation> {
  return fetchJson<Generation>(`/generation/${idOrName}`);
}
