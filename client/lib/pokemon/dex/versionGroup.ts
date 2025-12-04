// lib/pokemon/pokeapi/versionGroup.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type VersionGroup = {
  id: number;
  name: string;
  order: number;
  generation: NamedAPIResource;
  move_learn_methods: NamedAPIResource[];
  pokedexes: NamedAPIResource[];
  regions: NamedAPIResource[];
  versions: NamedAPIResource[];
};

export async function getVersionGroup(
  idOrName: number | string
): Promise<VersionGroup> {
  return fetchJson<VersionGroup>(`/version-group/${idOrName}`);
}
