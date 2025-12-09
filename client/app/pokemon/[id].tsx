// app/pokemon/[id].tsx
import { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, Image, TouchableOpacity, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { getTypeStyle } from "@/lib/ui/typeStyles";

import PageWrapper from "@/components/PageWrapper";
import {
  usePokemonCollectionStore,
  type HuntMethod,
} from "@/store/collectionStore";
import { getGameById, games } from "@/lib/data/pokemon/gameFilters";
import {
  getPokedex,
  type EvolutionChain,
  type EvolutionChainLink,
  getEvolutionChainByUrl,
  getPokemon,
  getPokemonEncounters,
  getPokemonSpecies,
  getType,
  type LocationAreaEncounter,
  type Pokemon,
  type PokemonSpecies,
} from "@/lib/pokemon/index";

import PokemonVariantBrowser, {
  type PokemonVariant,
  type PokemonVariantKind,
} from "@/components/Pokemon/PokemonDetails/PokemonVariantBrowser";
import PokemonStatsCard from "@/components/Pokemon/PokemonDetails/PokemonStatsCard";
import PokemonTypeMatchups from "@/components/Pokemon/PokemonDetails/PokemonTypeMatchups";
import PokemonEvolutionLine from "@/components/Pokemon/PokemonDetails/PokemonEvolutionLine";
import PokemonCollectionStatus from "@/components/Pokemon/PokemonDetails/PokemonCollectionStatus";
import PokemonShinyHunt from "@/components/Pokemon/PokemonDetails/PokemonShinyHunt";
import PokemonTeamToggle from "@/components/Pokemon/PokemonDetails/PokemonTeamToggle";
import PokemonMovesSheet from "@/components/Pokemon/PokemonDetails/PokemonMovesSheet";
import PokemonAbilitiesSheet from "@/components/Pokemon/PokemonDetails/PokemonAbilitiesSheet";
import PokedexEntryStrip from "@/components/Pokemon/PokemonDetails/PokedexEntryStrip";
import PokemonEncounterLocations from "@/components/Pokemon/PokemonDetails/PokemonEncounterLocations";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function titleCaseFromSlug(str: string) {
  return str
    .split("-")
    .map((part) => capitalize(part))
    .join(" ");
}

function humanizeSlug(name?: string | null): string {
  if (!name) return "-";
  return name
    .split("-")
    .map((p) => (p ? capitalize(p) : p))
    .join(" ");
}

function inferVariantKind(name: string): {
  kind: PokemonVariantKind;
  regionTag?: string;
} {
  const n = name.toLowerCase();

  if (n.includes("alola")) return { kind: "alolan", regionTag: "Alola" };
  if (n.includes("galar")) return { kind: "galarian", regionTag: "Galar" };
  if (n.includes("hisui")) return { kind: "hisuian", regionTag: "Hisui" };
  if (n.includes("paldea")) return { kind: "paldean", regionTag: "Paldea" };
  if (n.includes("mega")) return { kind: "mega", regionTag: "Mega" };
  if (n.includes("gmax") || n.includes("gigantamax")) {
    return { kind: "gigantamax", regionTag: "G-Max" };
  }

  return { kind: "other" };
}

function buildVariantLabel(
  monName: string,
  speciesName: string,
  isDefault: boolean
): string {
  if (isDefault) return "Base";

  const lowerSpecies = speciesName.toLowerCase();
  const lowerMon = monName.toLowerCase();

  if (lowerMon.startsWith(lowerSpecies)) {
    const suffix = lowerMon.slice(lowerSpecies.length).replace(/^-/, "");
    if (!suffix) return capitalize(monName);
    return capitalize(suffix);
  }

  return capitalize(monName);
}

type DexSlot = {
  number: string;
  labels: string[];
};

type EvolutionStep = {
  fromName: string;
  toName: string;
  details: string;
};

type EvolutionDetail =
  EvolutionChainLink["evolves_to"][number]["evolution_details"][number];

function formatEvolutionDetails(detail: EvolutionDetail): string {
  const parts: string[] = [];
  const trigger = detail.trigger?.name;

  if (trigger === "trade") {
    parts.push("Trade");
    if (detail.held_item) {
      parts.push(`while holding ${humanizeSlug(detail.held_item.name)}`);
    }
    if (detail.trade_species) {
      parts.push(`for ${humanizeSlug(detail.trade_species.name)}`);
    }
  } else if (trigger === "use-item" && detail.item) {
    parts.push(`Use ${humanizeSlug(detail.item.name)}`);
  } else if (trigger === "level-up") {
    if (detail.min_level != null) {
      parts.push(`Level ${detail.min_level}`);
    } else {
      parts.push("Level up");
    }
  } else if (trigger) {
    parts.push(humanizeSlug(trigger));
  } else {
    parts.push("Evolves");
  }

  if (detail.time_of_day) {
    parts.push(`during the ${detail.time_of_day}`);
  }

  if (detail.min_happiness != null) {
    parts.push("with high friendship");
  }

  if (detail.location) {
    parts.push(`at ${humanizeSlug(detail.location.name)}`);
  }

  if (detail.gender != null) {
    const genderText = detail.gender === 1 ? "female" : "male";
    parts.push(`(${genderText} only)`);
  }

  if (detail.needs_overworld_rain) {
    parts.push("while it's raining");
  }

  if (detail.turn_upside_down) {
    parts.push("while the console is upside down");
  }

  if (detail.known_move) {
    parts.push(`knowing ${humanizeSlug(detail.known_move.name)}`);
  }

  if (detail.known_move_type) {
    parts.push(
      `knowing a ${humanizeSlug(detail.known_move_type.name)}-type move`
    );
  }

  if (detail.party_species) {
    parts.push(
      `with ${humanizeSlug(detail.party_species.name)} in the party`
    );
  }

  if (detail.party_type) {
    parts.push(
      `with a ${humanizeSlug(detail.party_type.name)}-type Pokémon in the party`
    );
  }

  if (detail.relative_physical_stats != null) {
    if (detail.relative_physical_stats === 1) {
      parts.push("with Attack > Defense");
    } else if (detail.relative_physical_stats === -1) {
      parts.push("with Attack < Defense");
    } else {
      parts.push("with Attack = Defense");
    }
  }

  if (detail.min_beauty != null) {
    parts.push("with high beauty");
  }

  if (detail.min_affection != null) {
    parts.push("with high affection");
  }

  return parts.join(" ");
}

export default function PokemonDetailScreen() {
  const { id, gameId } = useLocalSearchParams<{
    id: string;
    gameId?: string;
  }>();

  const [data, setData] = useState<Pokemon | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [evolutionNames, setEvolutionNames] = useState<string[]>([]);
  const [evolutionSteps, setEvolutionSteps] = useState<EvolutionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [movesSheetVisible, setMovesSheetVisible] = useState(false);
  const [abilitiesSheetVisible, setAbilitiesSheetVisible] = useState(false);

  const [variants, setVariants] = useState<PokemonVariant[]>([]);
  const [variantMonByKey, setVariantMonByKey] = useState<Record<string, Pokemon>>(
    {}
  );
  const [activeVariantKey, setActiveVariantKey] = useState<string>("");

  const [showShiny, setShowShiny] = useState(false);
  const [encounters, setEncounters] = useState<LocationAreaEncounter[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);

  const getEntry = usePokemonCollectionStore((s) => s.getEntry);
  const toggleCaught = usePokemonCollectionStore((s) => s.toggleCaught);
  const toggleShiny = usePokemonCollectionStore((s) => s.toggleShiny);
  const toggleAlpha = usePokemonCollectionStore((s) => s.toggleAlpha);
  const toggleFavorite = usePokemonCollectionStore((s) => s.toggleFavorite);
  const isFavorite = usePokemonCollectionStore((s) => s.isFavorite);
  const teams = usePokemonCollectionStore((s) => s.teams);
  const addToTeam = usePokemonCollectionStore((s) => s.addToTeam);
  const removeFromTeam = usePokemonCollectionStore((s) => s.removeFromTeam);
  const incrementHuntCount = usePokemonCollectionStore(
    (s) => s.incrementHuntCount
  );
  const decrementHuntCount = usePokemonCollectionStore(
    (s) => s.decrementHuntCount
  );
  const setHuntMethod = usePokemonCollectionStore((s) => s.setHuntMethod);
  const setNotes = usePokemonCollectionStore((s) => s.setNotes);

  const entries = usePokemonCollectionStore((s) => s.entries);
  void entries;

  const game = useMemo(
    () => (gameId ? getGameById(gameId) : null),
    [gameId]
  );

  const [dexSlots, setDexSlots] = useState<DexSlot[]>([]);

  const [availableGames, setAvailableGames] = useState<typeof games>([]);
  const [availableGamesLoading, setAvailableGamesLoading] = useState(false);

  const ownershipGameFilterIds = useMemo(
    () =>
      availableGames && availableGames.length > 0
        ? availableGames.map((g) => g.id)
        : [],
    [availableGames]
  );

  const cryUrl = data?.cries?.latest ?? null;
  const cryPlayer = useAudioPlayer(cryUrl, {
    downloadFirst: true,
  });
  const cryStatus = useAudioPlayerStatus(cryPlayer);
  const [hasAutoplayedCry, setHasAutoplayedCry] = useState(false);

  useEffect(() => {
    setHasAutoplayedCry(false);
  }, [cryUrl]);

  useEffect(() => {
    if (loading) return;

    if (!cryUrl) return;
    if (!cryStatus.isLoaded) return;
    if (hasAutoplayedCry) return;

    try {
      cryPlayer.seekTo(0);
      cryPlayer.play();
      setHasAutoplayedCry(true);
    } catch (e) {
      console.warn("Failed to auto-play Pokémon cry:", e);
    }
  }, [cryUrl, cryStatus.isLoaded, hasAutoplayedCry, cryPlayer, loading]);

  const handlePlayCry = () => {
    if (!cryUrl) return;
    try {
      cryPlayer.seekTo(0);
      cryPlayer.play();
    } catch (e) {
      console.warn("Failed to replay Pokémon cry:", e);
    }
  };

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

        const speciesPromise = getPokemonSpecies(mon.id);
        const typePromises = mon.types.map((t) => getType(t.type.name));

        const [speciesData, typeDetails] = await Promise.all([
          speciesPromise,
          Promise.all(typePromises),
        ]);

        if (!isMounted) return;

        setSpecies(speciesData);

        const weakSet = new Set<string>();
        const strongSet = new Set<string>();

        typeDetails.forEach((td) => {
          td.damage_relations.double_damage_from.forEach((t) =>
            weakSet.add(t.name)
          );
          td.damage_relations.double_damage_to.forEach((t) =>
            strongSet.add(t.name)
          );
        });

        setWeaknesses(Array.from(weakSet));
        setStrengths(Array.from(strongSet));

        if (speciesData.evolution_chain?.url) {
          const chain: EvolutionChain = await getEvolutionChainByUrl(
            speciesData.evolution_chain.url
          );
          if (!isMounted) return;

          const names: string[] = [];
          const steps: EvolutionStep[] = [];

          const walk = (node: EvolutionChainLink) => {
            names.push(node.species.name);

            node.evolves_to.forEach((child) => {
              const fromName = node.species.name;
              const toName = child.species.name;

              const detail = child.evolution_details?.[0] as
                | EvolutionDetail
                | undefined;

              const detailsText = detail
                ? formatEvolutionDetails(detail)
                : "Evolves";

              steps.push({
                fromName,
                toName,
                details: detailsText,
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

        if (speciesData.varieties && speciesData.varieties.length > 0) {
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

            const label = buildVariantLabel(
              vMon.name,
              speciesData.name,
              v.is_default
            );

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

          const defaultVar =
            speciesData.varieties.find((v) => v.is_default) ??
            speciesData.varieties[0];

          setActiveVariantKey(defaultVar.pokemon.name);
        } else {
          const key = mon.name;
          const normalArt =
            mon.sprites.other?.["official-artwork"]?.front_default ??
            mon.sprites.front_default ??
            null;

          setVariantMonByKey({ [key]: mon });
          setVariants([
            {
              key,
              label: "Base",
              subtitle: "Default form",
              kind: "base",
              imageUrl: normalArt,
            },
          ]);
          setActiveVariantKey(key);
        }

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
  }, [id]);

  useEffect(() => {
    if (!species) return;

    let cancelled = false;

    (async () => {
      try {
        setAvailableGamesLoading(true);

        const rawPokedexNumbers = species.pokedex_numbers ?? [];

        const nationalEntry = rawPokedexNumbers.find(
          (pn) => pn.pokedex.name === "national"
        );

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
                ? [
                  {
                    number: String(nationalEntry.entry_number).padStart(
                      4,
                      "0"
                    ),
                    labels: ["National"],
                  },
                ]
                : []
            );
          }
          return;
        }

        const pokedexes = await Promise.all(
          pokedexNames.map((name) => getPokedex(name))
        );

        if (cancelled) return;

        const speciesVersionGroups = new Set<string>();

        pokedexes.forEach((dex) => {
          dex.version_groups.forEach((vg) => {
            if (vg.name) speciesVersionGroups.add(vg.name);
          });
        });

        const matchedGames = games.filter((g) =>
          g.versionGroups.some((vg) => speciesVersionGroups.has(vg))
        );

        if (!cancelled) {
          setAvailableGames(matchedGames);
        }

        const grouped = new Map<string, Set<string>>();

        const addLabel = (num: string, label: string) => {
          if (!grouped.has(num)) {
            grouped.set(num, new Set());
          }
          const set = grouped.get(num)!;
          label.split("/").forEach((part) => {
            const trimmed = part.trim();
            if (trimmed) set.add(trimmed);
          });
        };

        if (nationalEntry) {
          const num = String(nationalEntry.entry_number).padStart(4, "0");
          addLabel(num, "National");
        }

        pokedexes.forEach((dex) => {
          const entry = rawPokedexNumbers.find(
            (pn) => pn.pokedex.name === dex.name
          );
          if (!entry) return;

          const num = String(entry.entry_number).padStart(4, "0");
          const dexVgNames = new Set(dex.version_groups.map((vg) => vg.name));
          const gamesForDex = games.filter((g) =>
            g.versionGroups.some((vg) => dexVgNames.has(vg))
          );

          if (gamesForDex.length > 0) {
            gamesForDex.forEach((g) => addLabel(num, g.shortCode));
          } else {
            addLabel(num, `${titleCaseFromSlug(dex.name)} Dex`);
          }
        });

        const slots: DexSlot[] = Array.from(grouped.entries())
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([number, labelsSet]) => ({
            number,
            labels: Array.from(labelsSet),
          }));

        if (!cancelled) {
          setDexSlots(slots);
        }
      } catch (error) {
        console.error("Failed to resolve available games for species", error);
        if (!cancelled) {
          setAvailableGames([]);
          setDexSlots([]);
        }
      } finally {
        if (!cancelled) {
          setAvailableGamesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [species]);

  const monToDisplay = useMemo(() => {
    if (!data) return null;
    if (!activeVariantKey) return data;
    return variantMonByKey[activeVariantKey] ?? data;
  }, [data, activeVariantKey, variantMonByKey]);

  const artGallery = useMemo(() => {
    if (!monToDisplay) return [];

    const s = monToDisplay.sprites;
    type ArtItem = { key: string; label: string; url: string; };
    const items: ArtItem[] = [];
    const wantShiny = showShiny;

    const pushIf = (
      key: string,
      label: string,
      url: string | null | undefined,
      isShiny: boolean
    ) => {
      if (!url) return;
      if (isShiny !== wantShiny) return;
      items.push({ key, label, url });
    };

    pushIf(
      "official",
      "Official",
      s.other?.["official-artwork"]?.front_default ?? null,
      false
    );
    pushIf(
      "official-shiny",
      "Official shiny",
      s.other?.["official-artwork"]?.front_shiny ?? null,
      true
    );

    pushIf("home", "Home", s.other?.home?.front_default ?? null, false);
    pushIf("home-shiny", "Home shiny", s.other?.home?.front_shiny ?? null, true);

    pushIf(
      "showdown-front",
      "Showdown",
      s.other?.showdown?.front_default ?? null,
      false
    );
    pushIf(
      "showdown-front-shiny",
      "Showdown shiny",
      s.other?.showdown?.front_shiny ?? null,
      true
    );
    pushIf(
      "showdown-back",
      "Showdown back",
      s.other?.showdown?.back_default ?? null,
      false
    );
    pushIf(
      "showdown-back-shiny",
      "Showdown back shiny",
      s.other?.showdown?.back_shiny ?? null,
      true
    );

    if (items.length === 0) {
      const normalFallback = s.front_default;
      const shinyFallback = s.front_shiny;

      if (!wantShiny && normalFallback) {
        items.push({
          key: "sprite-front",
          label: "Sprite",
          url: normalFallback,
        });
      } else if (wantShiny && (shinyFallback || normalFallback)) {
        items.push({
          key: "sprite-front-shiny",
          label: shinyFallback ? "Sprite shiny" : "Sprite",
          url: shinyFallback ?? normalFallback!,
        });
      }
    }

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [monToDisplay, showShiny]);

  const spriteGallery = useMemo(() => {
    if (!monToDisplay) return [];
    const s = monToDisplay.sprites;

    const items = [
      { key: "front", label: "Front", url: s.front_default },
      { key: "back", label: "Back", url: s.back_default },
      { key: "front-shiny", label: "Front shiny", url: s.front_shiny },
      { key: "back-shiny", label: "Back shiny", url: s.back_shiny },
    ];

    return items.filter((i) => i.url);
  }, [monToDisplay]);

  const gameTeams = useMemo(
    () =>
      game ? Object.values(teams).filter((t) => t.gameId === game.id) : [],
    [game, teams]
  );

  const primaryTeam = gameTeams[0] ?? null;

  const genderText = useMemo(() => {
    if (!species) return "-";
    const rate = species.gender_rate;
    if (rate === -1) return "Genderless";

    const female = Math.round((rate / 8) * 100);
    const male = 100 - female;
    return `${male}% ♂ / ${female}% ♀`;
  }, [species]);

  const eggGroupText = useMemo(() => {
    if (!species?.egg_groups || species.egg_groups.length === 0) return "-";
    return species.egg_groups.map((g) => humanizeSlug(g.name)).join(", ");
  }, [species]);

  const habitatText = useMemo(
    () => humanizeSlug(species?.habitat?.name ?? null),
    [species]
  );

  const growthRateText = useMemo(
    () => humanizeSlug(species?.growth_rate?.name ?? null),
    [species]
  );

  const captureRateText = species ? `${species.capture_rate}` : "-";
  const baseHappinessText = species ? `${species.base_happiness}` : "-";

  const evolutionRequirementForCurrent = useMemo(() => {
    if (!data || evolutionSteps.length === 0) return null;

    const current = data.name;

    const incoming = evolutionSteps.find((s) => s.toName === current);
    if (incoming) {
      return `Evolves from ${capitalize(incoming.fromName)}: ${incoming.details}`;
    }

    const outgoing = evolutionSteps.find((s) => s.fromName === current);
    if (outgoing) {
      return `Evolves into ${capitalize(
        outgoing.toName
      )}: ${outgoing.details}`;
    }

    return null;
  }, [data, evolutionSteps]);

  const frontSprite = useMemo(
    () =>
      monToDisplay
        ? showShiny
          ? monToDisplay.sprites.front_shiny ??
          monToDisplay.sprites.front_default
          : monToDisplay.sprites.front_default
        : null,
    [monToDisplay, showShiny]
  );

  const backSprite = useMemo(
    () =>
      monToDisplay
        ? showShiny
          ? monToDisplay.sprites.back_shiny ??
          monToDisplay.sprites.back_default
          : monToDisplay.sprites.back_default
        : null,
    [monToDisplay, showShiny]
  );

  const [selectedHeroUrl, setSelectedHeroUrl] = useState<string | null>(null);
  const [selectedHeroLabel, setSelectedHeroLabel] = useState<string | null>(
    null
  );

  useEffect(() => {
    setSelectedHeroUrl(null);
    setSelectedHeroLabel(null);
  }, [monToDisplay, showShiny]);

  const heroThumbnails = useMemo(() => {
    type Thumb = { key: string; label: string; url: string; };
    const thumbs: Thumb[] = [];

    if (frontSprite) {
      thumbs.push({
        key: "thumb-front",
        label: showShiny ? "Front shiny" : "Front",
        url: frontSprite,
      });
    }

    if (backSprite) {
      thumbs.push({
        key: "thumb-back",
        label: showShiny ? "Back shiny" : "Back",
        url: backSprite,
      });
    }

    artGallery.forEach((art) => {
      thumbs.push({
        key: `art-${art.key}`,
        label: art.label,
        url: art.url,
      });
    });

    return thumbs;
  }, [frontSprite, backSprite, artGallery, showShiny]);

  if (loading || !data || !monToDisplay) {
    return (
      <PageWrapper title="Pokémon Detail" scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">
            Loading Pokémon…
          </Text>
        </View>
      </PageWrapper>
    );
  }

  const speciesId = data.id;
  const favorite = isFavorite(speciesId);

  const entry =
    game && speciesId
      ? getEntry(game.id, speciesId)
      : {
        caught: false,
        shiny: false,
        alpha: false,
        shinyHuntCount: 0,
        shinyHuntMethod: "none" as HuntMethod,
        notes: "",
      };

  const officialArt =
    monToDisplay.sprites.other?.["official-artwork"]?.front_default ??
    monToDisplay.sprites.front_default ??
    null;

  const shinyArt =
    monToDisplay.sprites.other?.["official-artwork"]?.front_shiny ??
    monToDisplay.sprites.front_shiny ??
    null;

  const mainArt = showShiny && shinyArt ? shinyArt : officialArt;

  const canTrack = !!game;
  const inPrimaryTeam =
    !!primaryTeam && primaryTeam.memberIds.includes(speciesId);

  const huntCount = entry.shinyHuntCount || 0;
  const huntMethod = entry.shinyHuntMethod || "none";

  const handleSetHuntMethod = (method: HuntMethod) => {
    if (!game) return;
    setHuntMethod(game.id, speciesId, method);
  };

  const handleNotesChange = (text: string) => {
    if (!game) return;
    setNotes(game.id, speciesId, text);
  };

  const dexLine = `#${String(data.id).padStart(3, "0")}`;

  const subtitle = game
    ? `${dexLine} • ${game.title}`
    : `${dexLine} • National Dex`;

  const heroImageUrl = selectedHeroUrl ?? mainArt;
  const heroLabel =
    selectedHeroLabel ?? (showShiny ? "Official shiny" : "Official");
  const hasCustomHero = !!selectedHeroUrl;

  const handleResetHero = () => {
    setSelectedHeroUrl(null);
    setSelectedHeroLabel(null);
  };

  return (
    <PageWrapper
      scroll
      title={capitalize(data.name)}
      subtitle={subtitle}
      rightActions={
        <TouchableOpacity onPress={() => toggleFavorite(speciesId)}>
          <MaterialCommunityIcons
            name={favorite ? "heart" : "heart-outline"}
            size={22}
            color={favorite ? "#f97373" : "#e5e7eb"}
          />
        </TouchableOpacity>
      }
    >
      {game ? (
        <View className="inline-flex self-start rounded-full px-3 py-1 bg-s
late-900 border border-slate-700 mb-3">
          <Text
            className="text-[11px] font-semibold"
            style={{ color: game.accentColor[0] }}
          >
            {game.title}
          </Text>
        </View>
      ) : (
        <Text className="text-[11px] text-slate-500 mb-3">
          No specific game selected • per-game ownership and hunts work best
          when opened from a game’s Pokédex.
        </Text>
      )}

      {/* Forms / variants browser */}
      <PokemonVariantBrowser
        variants={variants}
        activeKey={activeVariantKey}
        onSelect={(key) => setActiveVariantKey(key)}
      />

      {/* Hero: single main picture + thumbnails + Normal/Shiny toggle */}
      {(frontSprite || backSprite || heroImageUrl) && (
        <View className="items-center justify-center mb-3">
          {/* Main hero image with optional reset */}
          {heroImageUrl && (
            <View className="mb-2">
              <View className="items-center justify-center">
                <View>
                  <Image
                    source={{ uri: heroImageUrl }}
                    style={{ width: 240, height: 240 }}
                    resizeMode="contain"
                  />
                  {hasCustomHero && (
                    <TouchableOpacity
                      onPress={handleResetHero}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        padding: 4,
                        borderRadius: 999,
                        backgroundColor: "rgba(15,23,42,0.9)",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="refresh"
                        size={16}
                        color="#e5e7eb"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text className="mt-1 text-[11px] text-slate-400 text-center">
                {heroLabel}
              </Text>
            </View>
          )}

          {/* 🔊 Play cry button */}
          {data.cries?.latest && (
            <TouchableOpacity
              onPress={handlePlayCry}
              className="flex-row items-center rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5 mb-1"
            >
              <MaterialCommunityIcons
                name="volume-high"
                size={16}
                color="#e5e7eb"
              />
              <Text className="ml-1 text-[11px] text-slate-100 font-semibold">
                Play cry
              </Text>
            </TouchableOpacity>
          )}

          {/* Thumbnails: sprites + main arts */}
          {heroThumbnails.length > 0 && (
            <View className="mt-1 flex-row flex-wrap justify-center">
              {heroThumbnails.map((thumb) => {
                const isActive = selectedHeroUrl === thumb.url;
                return (
                  <TouchableOpacity
                    key={thumb.key}
                    onPress={() => {
                      setSelectedHeroUrl(thumb.url);
                      setSelectedHeroLabel(thumb.label);
                    }}
                    className="m-1 items-center"
                  >
                    <View
                      style={{
                        borderRadius: 16,
                        padding: 4,
                        borderWidth: 1.5,
                        borderColor: isActive ? "#38bdf8" : "#475569",
                        backgroundColor: "rgba(15,23,42,0.8)",
                      }}
                    >
                      <Image
                        source={{ uri: thumb.url }}
                        style={{ width: 60, height: 60 }}
                        resizeMode="contain"
                      />
                    </View>
                    <Text className="mt-0.5 text-[10px] text-slate-400">
                      {thumb.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Normal / Shiny toggle */}
          {(officialArt || shinyArt) && (
            <View className="mt-2 flex-row rounded-full bg-slate-900 border border-slate-700 px-1 py-1">
              <TouchableOpacity
                onPress={() => setShowShiny(false)}
                className={`px-3 py-1 rounded-full ${!showShiny ? "bg-slate-800" : ""
                  }`}
              >
                <Text
                  className="text-[11px] font-semibold"
                  style={{
                    color: !showShiny ? "#e5e7eb" : "#9ca3af",
                  }}
                >
                  Normal
                </Text>
              </TouchableOpacity>

              {shinyArt && (
                <TouchableOpacity
                  onPress={() => setShowShiny(true)}
                  className={`ml-1 px-3 py-1 rounded-full ${showShiny ? "bg-yellow-500/20" : ""
                    }`}
                >
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name={
                        showShiny
                          ? "star-four-points"
                          : "star-four-points-outline"
                      }
                      size={14}
                      color={showShiny ? "#facc15" : "#e5e7eb"}
                    />
                    <Text
                      className="ml-1 text-[11px] font-semibold"
                      style={{
                        color: showShiny ? "#facc15" : "#9ca3af",
                      }}
                    >
                      Shiny
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Types */}
      <View className="flex-row flex-wrap mb-3">
        {monToDisplay.types
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((t) => {
            const { bg, border, text, tint } = getTypeStyle(t.type.name);

            return (
              <LiquidGlass
                key={t.type.name}
                interactive={false}
                tinted
                tintColor={tint}
                showFallbackBackground
                style={{
                  borderRadius: 999,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <View
                  className={`px-4 py-2 rounded-full border ${bg} ${border}`}
                >
                  <Text className={`text-[12px] font-semibold ${text}`}>
                    {capitalize(t.type.name)}
                  </Text>
                </View>
              </LiquidGlass>
            );
          })}
      </View>

      {/* BIG overview section: dexes + profile + stats + battle data */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-slate-400 mb-1.5">
          Overview & battle profile
        </Text>

        <View
          className="rounded-3xl bg-slate-950/90 border px-3 py-3"
          style={{
            borderColor: game ? game.accentColor[0] : "#0ea5e9",
          }}
        >
          {(dexSlots.length > 0 || spriteGallery.length > 0) && (
            <View className="flex-row mb-3">
              {dexSlots.length > 0 && (
                <View className="flex-1 mr-2 rounded-2xl bg-slate-900/80 border border-slate-700 px-3 py-2">
                  <Text className="text-[11px] font-semibold text-slate-200 mb-1">
                    Dex numbers
                  </Text>
                  {dexSlots.map((slot, idx) => (
                    <View
                      key={`${slot.number}-${idx}`}
                      className="flex-row items-center justify-between py-0.5"
                    >
                      <Text className="text-[11px] font-mono text-slate-100">
                        {slot.number}
                      </Text>
                      <Text
                        className="text-[11px] text-slate-300 ml-3 flex-1 text-right"
                        numberOfLines={1}
                      >
                        {slot.labels.join(" • ")}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {species && (
            <View className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
              <Text className="text-[11px] font-semibold text-slate-400 mb-1.5">
                Profile
              </Text>

              <View className="flex-row mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-[11px] font-semibold text-slate-400">
                    Gender
                  </Text>
                  <Text className="text-[12px] text-slate-100 mt-0.5">
                    {genderText}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[11px] font-semibold text-slate-400">
                    Growth rate
                  </Text>
                  <Text className="text-[12px] text-slate-100 mt-0.5">
                    {growthRateText}
                  </Text>
                </View>
              </View>

              <View className="flex-row mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-[11px] font-semibold text-slate-400">
                    Egg groups
                  </Text>
                  <Text
                    className="text-[12px] text-slate-100 mt-0.5"
                    numberOfLines={2}
                  >
                    {eggGroupText}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[11px] font-semibold text-slate-400">
                    Habitat
                  </Text>
                  <Text className="text-[12px] text-slate-100 mt-0.5">
                    {habitatText}
                  </Text>
                </View>
              </View>

              <View className="flex-row">
                <View className="flex-1 mr-3">
                  <Text className="text-[11px] font-semibold text-slate-400">
                    Capture rate
                  </Text>
                  <Text className="text-[12px] text-slate-100 mt-0.5">
                    {captureRateText}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[11px] font-semibold text-slate-400">
                    Base happiness
                  </Text>
                  <Text className="text-[12px] text-slate-100 mt-0.5">
                    {baseHappinessText}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View className="mb-3">
            <PokemonStatsCard stats={monToDisplay.stats} />
          </View>

          <View>
            <Text className="text-[11px] font-semibold text-slate-400 mb-1.5">
              Battle data
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                disabled={
                  !monToDisplay.moves || monToDisplay.moves.length === 0
                }
                onPress={() => setMovesSheetVisible(true)}
                className="flex-1 mr-2 rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 flex-row items-center justify-center"
                style={
                  !monToDisplay.moves || monToDisplay.moves.length === 0
                    ? { opacity: 0.4 }
                    : undefined
                }
              >
                <MaterialCommunityIcons
                  name="sword-cross"
                  size={18}
                  color="#e5e7eb"
                />
                <Text className="ml-2 text-[12px] font-semibold text-slate-100">
                  Moves
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  !monToDisplay.abilities ||
                  monToDisplay.abilities.length === 0
                }
                onPress={() => setAbilitiesSheetVisible(true)}
                className="flex-1 rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 flex-row items-center justify-center"
                style={
                  !monToDisplay.abilities ||
                    monToDisplay.abilities.length === 0
                    ? { opacity: 0.4 }
                    : undefined
                }
              >
                <MaterialCommunityIcons
                  name="star-four-points-outline"
                  size={18}
                  color="#e5e7eb"
                />
                <Text className="ml-2 text-[12px] font-semibold text-slate-100">
                  Abilities
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <PokedexEntryStrip
        speciesId={speciesId}
        gameFilterIds={ownershipGameFilterIds}
      />

      <PokemonTypeMatchups weakTo={weaknesses} superEffectiveVs={strengths} />

      {/* Evolution requirement card */}
      {evolutionRequirementForCurrent && (
        <View className="mb-3 rounded-3xl bg-slate-950/90 border border-slate-800 px-3 py-3">
          <Text className="text-[11px] font-semibold text-slate-400 mb-1.5">
            Evolution requirement
          </Text>
          <Text className="text-[12px] text-slate-100">
            {evolutionRequirementForCurrent}
          </Text>
        </View>
      )}

      <PokemonEvolutionLine
        evolutionNames={evolutionNames}
        currentName={data.name}
        gameId={game?.id}
      />

      {canTrack && (
        <PokemonCollectionStatus
          entry={entry}
          onToggleCaught={() => game && toggleCaught(game.id, speciesId)}
          onToggleShiny={() => game && toggleShiny(game.id, speciesId)}
          onToggleAlpha={() => game && toggleAlpha(game.id, speciesId)}
        />
      )}

      {canTrack && (
        <PokemonShinyHunt
          count={huntCount}
          method={huntMethod}
          onIncrement={() => game && incrementHuntCount(game.id, speciesId)}
          onDecrement={() => game && decrementHuntCount(game.id, speciesId)}
          onSetMethod={(m) => handleSetHuntMethod(m)}
        />
      )}

      {canTrack && primaryTeam && (
        <PokemonTeamToggle
          team={primaryTeam}
          inTeam={inPrimaryTeam}
          onToggle={() =>
            inPrimaryTeam
              ? removeFromTeam(primaryTeam.id, speciesId)
              : addToTeam(primaryTeam.id, speciesId)
          }
        />
      )}

      {canTrack && (
        <View className="mt-2 mb-4">
          <Text className="text-xs font-semibold text-slate-400 mb-1">
            Notes
          </Text>
          <View className="rounded-2xl bg-slate-900 border border-slate-800 p-3">
            <TextInput
              multiline
              textAlignVertical="top"
              placeholder="Caught in Viridian Forest, Lv 5, OT RUBEN..."
              placeholderTextColor="#6b7280"
              className="text-[13px] text-slate-100"
              style={{ minHeight: 80 }}
              value={entry.notes ?? ""}
              onChangeText={handleNotesChange}
            />
          </View>
        </View>
      )}

      {/* Where to find / encounters */}
      <PokemonEncounterLocations
        encounters={encounters}
        loading={encountersLoading}
      />

      <View className="mt-4 mb-6">
        <Text className="text-sm font-semibold text-slate-200 mb-1">
          Coming Soon
        </Text>
        <Text className="text-[13px] text-slate-400">
          We’ll keep layering in richer move details, game-specific dex entries,
          locations, and held items for CreatureRealm.
        </Text>
      </View>

      <PokemonMovesSheet
        visible={movesSheetVisible}
        onClose={() => setMovesSheetVisible(false)}
        pokemonName={data.name}
        moves={monToDisplay.moves}
        gameId={game?.id}
      />

      <PokemonAbilitiesSheet
        visible={abilitiesSheetVisible}
        onClose={() => setAbilitiesSheetVisible(false)}
        abilities={monToDisplay.abilities}
      />
    </PageWrapper>
  );
}
