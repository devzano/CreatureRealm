// components/PokemonDetails/PokemonMovesSheet.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
  getMoveByUrl,
  type Move,
  type PokemonMoveSlot,
  type PokemonMoveVersionDetail,
} from "@/lib/pokemon/index";
import { getGameById } from "@/lib/pokemon/gameFilters";
import { getTypeStyle } from "@/lib/pokemon/ui/typeStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type PokemonMovesSheetProps = {
  visible: boolean;
  onClose: () => void;
  pokemonName: string;
  moves: PokemonMoveSlot[];
  gameId?: string | null;
};

type DamageClassFilter = "all" | "physical" | "special" | "status";

type MoveDetailsMap = Record<string, Move | null>;

type EnrichedMove = {
  key: string;
  slot: PokemonMoveSlot;
  detail: Move | null;
  level: number | null;
  methodName: string | null;
  damageClass: string | null;
  typeName: string | null;
};

// For the *ordering* of type filter chips
const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

function prettyName(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getEnglishEffect(move: Move | null): string | undefined {
  if (!move) return undefined;
  const entry = move.effect_entries.find(
    (e) => e.language.name === "en"
  );
  if (!entry) return undefined;

  // Optional: strip weird placeholders like $effect_chance
  return entry.short_effect.replace(
    /\$effect_chance/g,
    String(move.effect_chance ?? "")
  );
}

// Primary learn method, given the *filtered* version_group_details
function getPrimaryLearnMethod(
  details: PokemonMoveVersionDetail[]
): PokemonMoveVersionDetail | undefined {
  if (!details || details.length === 0) return undefined;

  const levelUpDetails = details.filter(
    (d) => d.move_learn_method.name === "level-up"
  );

  if (levelUpDetails.length > 0) {
    return levelUpDetails.reduce((best, curr) =>
      curr.level_learned_at < best.level_learned_at ? curr : best
    );
  }

  return details[0];
}

export default function PokemonMovesSheet({
  visible,
  onClose,
  pokemonName,
  moves,
  gameId,
}: PokemonMovesSheetProps) {
  const [query, setQuery] = useState("");
  const [damageFilter, setDamageFilter] =
    useState<DamageClassFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [moveDetails, setMoveDetails] = useState<MoveDetailsMap>({});

  const game = useMemo(
    () => (gameId ? getGameById(gameId) : null),
    [gameId]
  );

  // Reset search/filters when closed
  useEffect(() => {
    if (!visible) {
      setQuery("");
      setDamageFilter("all");
      setTypeFilter("all");
    }
  }, [visible]);

  // Prefetch move details when sheet opens
  useEffect(() => {
    if (!visible || moves.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // Build a map of unique move names → their canonical URL from PokéAPI
        const nameToUrl = new Map<string, string>();
        moves.forEach((m) => {
          if (!nameToUrl.has(m.move.name)) {
            nameToUrl.set(m.move.name, m.move.url);
          }
        });

        const results = await Promise.all(
          Array.from(nameToUrl.entries()).map(async ([name, url]) => {
            try {
              const detail = await getMoveByUrl(url);
              return { name, detail };
            } catch (e: any) {
              return { name, detail: null as Move | null };
            }
          })
        );

        if (cancelled) return;

        const map: MoveDetailsMap = {};
        results.forEach(({ name, detail }) => {
          map[name] = detail;
        });
        setMoveDetails(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, moves]);

  const enrichedMoves: EnrichedMove[] = useMemo(() => {
    const allowedVersionGroups = (game as any)?.versionGroups ?? null;

    return (
      moves
        .map<EnrichedMove | null>((slot) => {
          const moveName = slot.move.name;
          const detail = moveDetails[moveName] ?? null;

          const allDetails = slot.version_group_details ?? [];

          // Filter to only the version groups relevant to this game
          const usableDetails =
            allowedVersionGroups && allowedVersionGroups.length > 0
              ? allDetails.filter((d) =>
                  allowedVersionGroups.includes(d.version_group.name)
                )
              : allDetails;

          // If in a specific game and the move has no entries for that game's groups,
          // treat it as "not available in this game"
          if (
            allowedVersionGroups &&
            allowedVersionGroups.length > 0 &&
            usableDetails.length === 0
          ) {
            return null;
          }

          const primary = getPrimaryLearnMethod(usableDetails);

          const level = primary?.level_learned_at ?? null;
          const methodName = primary?.move_learn_method.name ?? null;

          const damageClass = detail?.damage_class?.name ?? null;
          const typeName = detail?.type?.name ?? null;

          return {
            key: moveName,
            slot,
            detail,
            level,
            methodName,
            damageClass,
            typeName,
          };
        })
        .filter((m): m is EnrichedMove => m !== null)
    );
  }, [moves, moveDetails, game]);

  // Types that actually appear on this Pokémon's moves (post game-filter)
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    enrichedMoves.forEach((m) => {
      if (m.typeName) {
        set.add(m.typeName.toLowerCase());
      }
    });
    // Keep order consistent with POKEMON_TYPES
    return POKEMON_TYPES.filter((t) => set.has(t));
  }, [enrichedMoves]);

  const filteredMoves = useMemo(() => {
    let list = enrichedMoves;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) =>
        m.key.toLowerCase().includes(q)
      );
    }

    if (damageFilter !== "all") {
      list = list.filter(
        (m) => m.damageClass === damageFilter
      );
    }

    if (typeFilter !== "all") {
      list = list.filter(
        (m) => (m.typeName ?? "").toLowerCase() === typeFilter
      );
    }

    // Sort: level-up first by level, then others alphabetical
    list = [...list].sort((a, b) => {
      const aLevel = a.level ?? Infinity;
      const bLevel = b.level ?? Infinity;

      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }

      return a.key.localeCompare(b.key);
    });

    return list;
  }, [enrichedMoves, query, damageFilter, typeFilter]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View className="flex-row items-center mb-2">
        <Text style={styles.title}>
          Moves for {prettyName(pokemonName)}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons
            name="close"
            size={18}
            color="#e5e7eb"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <MaterialCommunityIcons
          name="magnify"
          size={16}
          color="#9ca3af"
          style={{ marginRight: 6 }}
        />
        <TextInput
          placeholder="Search move..."
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Damage class filter */}
      <View style={styles.filterRow}>
        {(["all", "physical", "special", "status"] as DamageClassFilter[]).map(
          (val) => {
            const active = damageFilter === val;
            const label =
              val === "all"
                ? "All"
                : val === "physical"
                ? "Physical"
                : val === "special"
                ? "Special"
                : "Status";
            return (
              <TouchableOpacity
                key={val}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setDamageFilter(val)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* Type filter – only show types that actually exist */}
      {availableTypes.length > 0 && (
        <View style={styles.typeFilterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {/* All types chip */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === "all" && styles.filterChipActive,
                { marginRight: 6 },
              ]}
              onPress={() => setTypeFilter("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === "all" && styles.filterChipTextActive,
                ]}
              >
                All types
              </Text>
            </TouchableOpacity>

            {/* Only chips for types present in this move list */}
            {availableTypes.map((t) => {
              const active = typeFilter === t;
              const typeStyle = getTypeStyle(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: typeStyle.tint,
                      backgroundColor: active ? typeStyle.tint : "#020617",
                    },
                    { marginRight: 6 },
                  ]}
                  onPress={() =>
                    setTypeFilter((prev) =>
                      prev === t ? "all" : t
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active ? "#020617" : "#e5e7eb",
                      },
                    ]}
                  >
                    {prettyName(t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Loading move data…</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({
    item,
  }: {
    item: (typeof filteredMoves)[number];
  }) => {
    const { detail, level, methodName, damageClass, typeName } = item;

    const power =
      detail?.power !== null && detail?.power !== undefined
        ? detail.power
        : "—";

    const pp =
      detail?.pp !== null && detail?.pp !== undefined ? detail.pp : "—";

    const accuracy =
      detail?.accuracy !== null && detail?.accuracy !== undefined
        ? `${detail.accuracy}%`
        : "—";

    const priority =
      detail?.priority !== undefined && detail.priority !== 0
        ? detail.priority > 0
          ? `+${detail.priority}`
          : detail.priority
        : null;

    const effect = getEnglishEffect(detail);

    const methodLabel = methodName
      ? prettyName(methodName)
      : "Unknown";

    const damageLabel = damageClass
      ? prettyName(damageClass)
      : "—";

    const typeLabel = typeName ? prettyName(typeName) : "—";

    const typeTint = typeName
      ? getTypeStyle(typeName).tint
      : "#64748b";

    return (
      <View style={styles.moveCard}>
        <View style={styles.moveHeaderRow}>
          <Text style={styles.moveName}>{prettyName(item.key)}</Text>
          <View style={styles.moveMetaRight}>
            {priority !== null && (
              <View style={styles.priorityPill}>
                <Text style={styles.priorityText}>
                  Prio {priority}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.moveTagsRow}>
          {/* Type pill with tint color */}
          <View
            style={[
              styles.tagPill,
              {
                borderColor: typeTint,
                backgroundColor: "rgba(15,23,42,0.95)",
              },
            ]}
          >
            <Text
              style={[
                styles.tagText,
                { color: typeTint },
              ]}
            >
              {typeLabel}
            </Text>
          </View>

          <View style={styles.tagPillMuted}>
            <Text style={styles.tagTextMuted}>{damageLabel}</Text>
          </View>
          <View style={styles.tagPillMuted}>
            <Text style={styles.tagTextMuted}>{methodLabel}</Text>
          </View>
          {level !== null && level !== undefined && level > 0 && (
            <View style={styles.tagPillLevel}>
              <Text style={styles.tagTextLevel}>
                Lv {level}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Power</Text>
            <Text style={styles.statValue}>{power}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Accuracy</Text>
            <Text style={styles.statValue}>{accuracy}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PP</Text>
            <Text style={styles.statValue}>{pp}</Text>
          </View>
        </View>

        {effect && (
          <Text
            style={styles.effectText}
            numberOfLines={3}
          >
            {effect}
          </Text>
        )}
      </View>
    );
  };

  return (
    <BottomSheetModal
      visible={visible}
      onRequestClose={onClose}
      overlayColor="rgba(3,7,18,0.85)"
      tintColor="#020617"
      fixedHeight={580}
    >
      <FlatList
        data={filteredMoves}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#f9fafb",
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#e5e7eb",
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  typeFilterRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginRight: 6,
    backgroundColor: "#020617",
  },
  filterChipActive: {
    backgroundColor: "#f97316",
    borderColor: "#ea580c",
  },
  filterChipText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#020617",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  loadingText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#9ca3af",
  },
  listContent: {
    paddingBottom: 8,
  },
  moveCard: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 8,
  },
  moveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  moveName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  moveMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#0f172a",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#eab308",
  },
  moveTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 4,
  },
  tagPillMuted: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
    marginRight: 4,
    marginBottom: 4,
  },
  tagPillLevel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#0369a1",
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f9fafb",
  },
  tagTextMuted: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
  },
  tagTextLevel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  effectText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
});