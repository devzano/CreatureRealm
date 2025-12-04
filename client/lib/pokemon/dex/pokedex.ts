// lib/api/pokeapi/pokedex.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type PokemonEntry = {
  entry_number: number;
  pokemon_species: NamedAPIResource;
};
export type PokedexDescription = {
  description: string;
  language: NamedAPIResource;
};

export type Pokedex = {
  id: number;
  name: string;
  descriptions: PokedexDescription[];
  is_main_series: boolean;
  pokemon_entries: PokemonEntry[];
  region: NamedAPIResource | null;
  version_groups: NamedAPIResource[];
};

export async function getPokedex(
  idOrName: number | string
): Promise<Pokedex> {
  return fetchJson<Pokedex>(`/pokedex/${idOrName}`);
}
