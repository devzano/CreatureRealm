// components/Pokemon/PokemonDetails/helpers/usePokemonDetailData.ts
import { useEffect, useMemo, useState } from "react";
import {
  getEvolutionChainByUrl,
  getPokemon,
  getPokemonEncounters,
  getPokemonSpecies,
  getType,
  type EvolutionChain,
  type EvolutionChainLink,
  type LocationAreaEncounter,
  type Pokemon,
  type PokemonSpecies,
} from "@/lib/pokemon/index";

import type { PokemonVariant, PokemonVariantKind } from "@/components/Pokemon/PokemonDetails/PokemonVariantBrowser";
import { buildVariantLabel, inferVariantKind, humanizeSlug, capitalize } from "./pokemonDetailHelpers";

type EvolutionDetail =
  EvolutionChainLink["evolves_to"][number]["evolution_details"][number];

export type EvolutionStep = {
  fromName: string;
  toName: string;
  details: string;
};

function formatEvolutionDetails(detail: EvolutionDetail): string {
  const parts: string[] = [];
  const trigger = detail.trigger?.name;

  if (trigger === "trade") {
    parts.push("Trade");
    if (detail.held_item) parts.push(`while holding ${humanizeSlug(detail.held_item.name)}`);
    if (detail.trade_species) parts.push(`for ${humanizeSlug(detail.trade_species.name)}`);
  } else if (trigger === "use-item" && detail.item) {
    parts.push(`Use ${humanizeSlug(detail.item.name)}`);
  } else if (trigger === "level-up") {
    parts.push(detail.min_level != null ? `Level ${detail.min_level}` : "Level up");
  } else if (trigger) {
    parts.push(humanizeSlug(trigger));
  } else {
    parts.push("Evolves");
  }

  if (detail.time_of_day) parts.push(`during the ${detail.time_of_day}`);
  if (detail.min_happiness != null) parts.push("with high friendship");
  if (detail.location) parts.push(`at ${humanizeSlug(detail.location.name)}`);
  if (detail.gender != null) parts.push(`(${detail.gender === 1 ? "female" : "male"} only)`);
  if (detail.needs_overworld_rain) parts.push("while it's raining");
  if (detail.turn_upside_down) parts.push("while the console is upside down");
  if (detail.known_move) parts.push(`knowing ${humanizeSlug(detail.known_move.name)}`);
  if (detail.known_move_type) parts.push(`knowing a ${humanizeSlug(detail.known_move_type.name)}-type move`);
  if (detail.party_species) parts.push(`with ${humanizeSlug(detail.party_species.name)} in the party`);
  if (detail.party_type) parts.push(`with a ${humanizeSlug(detail.party_type.name)}-type Pokémon in the party`);

  if (detail.relative_physical_stats != null) {
    parts.push(
      detail.relative_physical_stats === 1
        ? "with Attack > Defense"
        : detail.relative_physical_stats === -1
          ? "with Attack < Defense"
          : "with Attack = Defense"
    );
  }

  if (detail.min_beauty != null) parts.push("with high beauty");
  if (detail.min_affection != null) parts.push("with high affection");

  return parts.join(" ");
}

export function usePokemonDetailData(params: { id: string; form?: string }) {
  const { id, form } = params;

  const [data, setData] = useState<Pokemon | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);

  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);

  const [evolutionNames, setEvolutionNames] = useState<string[]>([]);
  const [evolutionSteps, setEvolutionSteps] = useState<EvolutionStep[]>([]);

  const [variants, setVariants] = useState<PokemonVariant[]>([]);
  const [variantMonByKey, setVariantMonByKey] = useState<Record<string, Pokemon>>({});
  const [activeVariantKey, setActiveVariantKey] = useState<string>("");

  const [encounters, setEncounters] = useState<LocationAreaEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [encountersLoading, setEncountersLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setEncountersLoading(true);

        const mon = await getPokemon(id);
        if (!isMounted) return;
        setData(mon);

        const [speciesData, typeDetails] = await Promise.all([
          getPokemonSpecies(mon.species.name),
          Promise.all(mon.types.map((t) => getType(t.type.name))),
        ]);

        if (!isMounted) return;
        setSpecies(speciesData);

        // weaknesses / strengths
        const weakSet = new Set<string>();
        const strongSet = new Set<string>();
        typeDetails.forEach((td) => {
          td.damage_relations.double_damage_from.forEach((t) => weakSet.add(t.name));
          td.damage_relations.double_damage_to.forEach((t) => strongSet.add(t.name));
        });
        setWeaknesses(Array.from(weakSet));
        setStrengths(Array.from(strongSet));

        // evolution chain
        if (speciesData.evolution_chain?.url) {
          const chain: EvolutionChain = await getEvolutionChainByUrl(speciesData.evolution_chain.url);
          if (!isMounted) return;

          const names: string[] = [];
          const steps: EvolutionStep[] = [];

          const walk = (node: EvolutionChainLink) => {
            names.push(node.species.name);

            node.evolves_to.forEach((child) => {
              const fromName = node.species.name;
              const toName = child.species.name;
              const detail = child.evolution_details?.[0] as EvolutionDetail | undefined;
              steps.push({
                fromName,
                toName,
                details: detail ? formatEvolutionDetails(detail) : "Evolves",
              });
              walk(child);
            });
          };

          walk(chain.chain);
          setEvolutionNames(names);
          setEvolutionSteps(steps);
        } else {
          setEvolutionNames([]);
          setEvolutionSteps([]);
        }

        // variants
        if (speciesData.varieties?.length) {
          const varietyMons = await Promise.all(
            speciesData.varieties.map((v) => getPokemon(v.pokemon.name))
          );
          if (!isMounted) return;

          const variantMap: Record<string, Pokemon> = {};
          const variantList: PokemonVariant[] = [];

          speciesData.varieties.forEach((v, idx) => {
            const vMon = varietyMons[idx];
            const key = v.pokemon.name;

            variantMap[key] = vMon;

            const label = buildVariantLabel(vMon.name, speciesData.name, v.is_default);
            const { kind, regionTag } = v.is_default
              ? { kind: "base" as PokemonVariantKind, regionTag: undefined }
              : inferVariantKind(vMon.name);

            const normalArt =
              vMon.sprites.other?.["official-artwork"]?.front_default ??
              vMon.sprites.front_default ??
              null;

            variantList.push({
              key,
              label,
              subtitle:
                kind === "base"
                  ? "Default form"
                  : kind === "mega"
                    ? "Mega evolution"
                    : kind === "gigantamax"
                      ? "Gigantamax form"
                      : "Regional form",
              regionTag,
              kind,
              imageUrl: normalArt,
            });
          });

          setVariantMonByKey(variantMap);
          setVariants(variantList);

          const requestedRaw =
            String(form ?? "").trim().toLowerCase() ||
            String(mon.name ?? "").trim().toLowerCase() ||
            String(id ?? "").trim().toLowerCase();

          const requestedExists =
            !!requestedRaw &&
            speciesData.varieties.some((v) => v.pokemon.name.toLowerCase() === requestedRaw);

          setActiveVariantKey(
            requestedExists
              ? requestedRaw
              : (speciesData.varieties.find((v) => v.is_default) ?? speciesData.varieties[0]).pokemon.name
          );
        } else {
          const key = mon.name;
          const normalArt =
            mon.sprites.other?.["official-artwork"]?.front_default ??
            mon.sprites.front_default ??
            null;

          setVariantMonByKey({ [key]: mon });
          setVariants([{ key, label: "Base", subtitle: "Default form", kind: "base", imageUrl: normalArt }]);
          setActiveVariantKey(key);
        }

        // encounters
        const encounterList = await getPokemonEncounters(mon.id);
        if (!isMounted) return;
        setEncounters(encounterList);
      } catch (e) {
        console.error("Failed to fetch Pokémon detail", e);
      } finally {
        if (isMounted) {
          setLoading(false);
          setEncountersLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id, form]);

  // allow ?form= to override after variant map arrives
  useEffect(() => {
    const requested = String(form ?? "").trim().toLowerCase();
    if (!requested) return;
    if (variantMonByKey[requested]) setActiveVariantKey(requested);
  }, [form, variantMonByKey]);

  const monToDisplay = useMemo(() => {
    if (!data) return null;
    if (!activeVariantKey) return data;
    return variantMonByKey[activeVariantKey] ?? data;
  }, [data, activeVariantKey, variantMonByKey]);

  const evolutionRequirementForCurrent = useMemo(() => {
    if (!data || evolutionSteps.length === 0) return null;

    const current = data.name;
    const incoming = evolutionSteps.find((s) => s.toName === current);
    if (incoming) return `Evolves from ${capitalize(incoming.fromName)}: ${incoming.details}`;

    const outgoing = evolutionSteps.find((s) => s.fromName === current);
    if (outgoing) return `Evolves into ${capitalize(outgoing.toName)}: ${outgoing.details}`;

    return null;
  }, [data, evolutionSteps]);

  return {
    loading,
    data,
    species,
    monToDisplay,

    weaknesses,
    strengths,

    variants,
    activeVariantKey,
    setActiveVariantKey,

    evolutionNames,
    evolutionSteps,
    evolutionRequirementForCurrent,

    encounters,
    encountersLoading,
  };
}
