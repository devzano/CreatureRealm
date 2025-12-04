// lib/api/pokeapi/characteristic.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type CharacteristicDescription = {
  description: string;
  language: NamedAPIResource;
};

export type Characteristic = {
  id: number;
  gene_modulo: number;
  possible_values: number[];
  descriptions: CharacteristicDescription[];
  highest_stat: NamedAPIResource;
};

/**
 * https://pokeapi.co/api/v2/characteristic/{id}/
 */
export async function getCharacteristic(
  id: number | string
): Promise<Characteristic> {
  // PokeAPI spec says {id} only, but we'll allow string-ish for convenience
  return fetchJson<Characteristic>(`/characteristic/${id}`);
}
