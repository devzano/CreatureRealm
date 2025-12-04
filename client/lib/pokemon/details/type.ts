// lib/api/pokeapi/type.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type TypeRef = NamedAPIResource;

export type TypeDamageRelations = {
  double_damage_from: TypeRef[];
  double_damage_to: TypeRef[];
  half_damage_from: TypeRef[];
  half_damage_to: TypeRef[];
  no_damage_from: TypeRef[];
  no_damage_to: TypeRef[];
};

export type PokemonType = {
  id: number;
  name: string;
  damage_relations: TypeDamageRelations;
};

/**
 * Type details (for weaknesses / strengths).
 */
export async function getType(
  idOrName: string | number
): Promise<PokemonType> {
  return fetchJson<PokemonType>(`/type/${idOrName}`);
}
