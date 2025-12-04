// components/PokemonDetails/PokemonAbilitiesSheet.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
  getAbility,
  type Ability,
  type PokemonAbilitySlot,
} from "@/lib/pokemon/index";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type PokemonAbilitiesSheetProps = {
  visible: boolean;
  onClose: () => void;
  abilities: PokemonAbilitySlot[];
};

type AbilityDetailsMap = Record<string, Ability | null>;

function prettyName(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getEnglishAbilityText(ability: Ability | null): string | undefined {
  if (!ability) return undefined;
  const entry = ability.effect_entries.find(
    (e) => e.language.name === "en"
  );
  if (!entry) return undefined;
  return entry.short_effect;
}

export default function PokemonAbilitiesSheet({
  visible,
  onClose,
  abilities,
}: PokemonAbilitiesSheetProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<AbilityDetailsMap>({});

  useEffect(() => {
    if (!visible || abilities.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const uniqueNames = Array.from(
          new Set(abilities.map((a) => a.ability.name))
        );

        const results = await Promise.all(
          uniqueNames.map(async (name) => {
            try {
              const detail = await getAbility(name);
              return { name, detail };
            } catch (e) {
              console.warn("Failed to fetch ability", name, e);
              return { name, detail: null as Ability | null };
            }
          })
        );

        if (cancelled) return;

        const map: AbilityDetailsMap = {};
        results.forEach(({ name, detail }) => {
          map[name] = detail;
        });
        setDetails(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, abilities]);

  const enriched = useMemo(
    () =>
      abilities.map((slot) => {
        const name = slot.ability.name;
        const detail = details[name] ?? null;
        const hidden = slot.is_hidden;

        const text = getEnglishAbilityText(detail);

        const totalUsers = detail?.pokemon?.length ?? 0;

        return {
          key: name,
          slot,
          detail,
          hidden,
          text,
          totalUsers,
        };
      }),
    [abilities, details]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Abilities</Text>
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

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>
            Loading ability data…
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({
    item,
  }: {
    item: (typeof enriched)[number];
  }) => {
    const { hidden, text, totalUsers } = item;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.name}>{prettyName(item.key)}</Text>
          {hidden && (
            <View style={styles.hiddenPill}>
              <Text style={styles.hiddenText}>Hidden</Text>
            </View>
          )}
        </View>

        {text && (
          <Text style={styles.description} numberOfLines={3}>
            {text}
          </Text>
        )}

        <View style={styles.footerRow}>
          <View style={styles.footerChip}>
            <MaterialCommunityIcons
              name="pokeball"
              size={12}
              color="#9ca3af"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.footerText}>
              Seen on {totalUsers || "—"} Pokémon
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
  <BottomSheetModal
    visible={visible}
    onRequestClose={onClose}
    overlayColor="rgba(3,7,18,0.85)"
    tintColor="#020617"
    fixedHeight={360}
  >
    <FlatList
      data={enriched}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={renderHeader}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
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
    marginBottom: 4,
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#9ca3af",
  },
  listContent: {
    paddingBottom: 8,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  hiddenPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#1f2937",
  },
  hiddenText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f97316",
  },
  description: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
  },
  footerChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#111827",
  },
  footerText: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "500",
  },
});
