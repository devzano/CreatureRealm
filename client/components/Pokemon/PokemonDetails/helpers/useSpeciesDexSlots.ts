import { useEffect, useMemo, useState } from "react";
import { getPokedex, type PokemonSpecies } from "@/lib/pokemon/index";
import { games } from "@/lib/pokemon/gameFilters";
import { titleCaseFromSlug } from "./pokemonDetailHelpers";

export type DexSlot = { number: string; labels: string[] };

export function useSpeciesDexSlots(species: PokemonSpecies | null) {
  const [dexSlots, setDexSlots] = useState<DexSlot[]>([]);
  const [availableGames, setAvailableGames] = useState<typeof games>([]);
  const [availableGamesLoading, setAvailableGamesLoading] = useState(false);

  const ownershipGameFilterIds = useMemo(
    () => (availableGames?.length ? availableGames.map((g) => g.id) : []),
    [availableGames]
  );

  useEffect(() => {
    if (!species) return;

    let cancelled = false;

    (async () => {
      try {
        setAvailableGamesLoading(true);

        const rawPokedexNumbers = species.pokedex_numbers ?? [];

        const nationalEntry = rawPokedexNumbers.find((pn) => pn.pokedex.name === "national");

        const pokedexNames = Array.from(
          new Set(
            rawPokedexNumbers
              .map((pn) => pn.pokedex.name)
              .filter((name) => {
                if (name === "national") return false;
                if (name.startsWith("updated-national")) return false;
                if (name.includes("conquest")) return false;
                if (name.includes("letsgo-gallery")) return false;
                return true;
              })
          )
        );

        if (pokedexNames.length === 0) {
          if (!cancelled) {
            setAvailableGames([]);
            setDexSlots(
              nationalEntry
                ? [{ number: String(nationalEntry.entry_number).padStart(4, "0"), labels: ["National"] }]
                : []
            );
          }
          return;
        }

        const pokedexes = await Promise.all(pokedexNames.map((name) => getPokedex(name)));
        if (cancelled) return;

        const speciesVersionGroups = new Set<string>();
        pokedexes.forEach((dex) => dex.version_groups.forEach((vg) => vg.name && speciesVersionGroups.add(vg.name)));

        const matchedGames = games.filter((g) => g.versionGroups.some((vg) => speciesVersionGroups.has(vg)));
        if (!cancelled) setAvailableGames(matchedGames);

        const grouped = new Map<string, Set<string>>();

        const addLabel = (num: string, label: string) => {
          if (!grouped.has(num)) grouped.set(num, new Set());
          const set = grouped.get(num)!;
          label.split("/").forEach((part) => {
            const trimmed = part.trim();
            if (trimmed) set.add(trimmed);
          });
        };

        if (nationalEntry) {
          addLabel(String(nationalEntry.entry_number).padStart(4, "0"), "National");
        }

        pokedexes.forEach((dex) => {
          const entry = rawPokedexNumbers.find((pn) => pn.pokedex.name === dex.name);
          if (!entry) return;

          const num = String(entry.entry_number).padStart(4, "0");

          const dexVgNames = new Set(dex.version_groups.map((vg) => vg.name));
          const gamesForDex = games.filter((g) => g.versionGroups.some((vg) => dexVgNames.has(vg)));

          if (gamesForDex.length > 0) {
            gamesForDex.forEach((g) => addLabel(num, g.shortCode));
          } else {
            addLabel(num, `${titleCaseFromSlug(dex.name)} Dex`);
          }
        });

        const slots: DexSlot[] = Array.from(grouped.entries())
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([number, labelsSet]) => ({ number, labels: Array.from(labelsSet) }));

        if (!cancelled) setDexSlots(slots);
      } catch (error) {
        console.error("Failed to resolve available games for species", error);
        if (!cancelled) {
          setAvailableGames([]);
          setDexSlots([]);
        }
      } finally {
        if (!cancelled) setAvailableGamesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [species]);

  return { dexSlots, availableGames, availableGamesLoading, ownershipGameFilterIds };
}
