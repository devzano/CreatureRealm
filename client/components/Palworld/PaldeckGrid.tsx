// components/Palworld/PaldeckGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import type { PalListItem } from "@/lib/palworld/paldbDeck";
import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";
import AppImages from "@/constants/images";
import RemoteIcon from "../RemoteIcon";
import { Image } from "expo-image";

export type PalDexFilter = "all" | "caught" | "lucky" | "alpha";

const EMPTY_ENTRY = Object.freeze({
  caught: false,
  lucky: false,
  alpha: false,
  luckyHuntCount: 0,
  luckyHuntMethod: "none" as const,
  notes: "",
});

const ACTIVE_HIGHLIGHT = "#0cd3f1";

type PaldeckGridProps = {
  pals: PalListItem[];
  search: string;
  dexFilter: PalDexFilter;
  onChangeDexFilter: (next: PalDexFilter) => void;
};

function palDexId(p: PalListItem): string {
  const nr = String((p as any)?.numberRaw ?? "").trim();
  if (nr) return nr;

  const n = String((p as any)?.number ?? "").trim();
  if (n) return n;

  const id = String((p as any)?.id ?? "").trim();
  return id || "unknown";
}

const PaldeckGrid: React.FC<PaldeckGridProps> = ({ pals, search, dexFilter, onChangeDexFilter }) => {
  const router = useRouter();
  const entries = usePalworldCollectionStore((s) => s.entries);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPals = useMemo(() => {
    let base = pals;

    if (normalizedSearch) {
      base = base.filter((p) => {
        const elementStr = (p.elements ?? []).join(" ");
        const haystack = `${(p as any).numberRaw ?? ""} ${p.number} ${p.name} ${p.id} ${elementStr}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    if (dexFilter !== "all") {
      base = base.filter((p) => {
        const dexId = palDexId(p);
        const entry = (entries[dexId] as any) ?? EMPTY_ENTRY;

        if (dexFilter === "caught") return !!entry.caught;
        if (dexFilter === "lucky") return !!entry.lucky;
        if (dexFilter === "alpha") return !!entry.alpha;
        return true;
      });
    }

    return base;
  }, [pals, normalizedSearch, dexFilter, entries]);

  const onOpenDetails = useCallback(
    (palId: string) => {
      router.push({
        pathname: "/pal/[id]",
        params: { id: palId },
      } as any);
    },
    [router]
  );

  const renderDexItem = useCallback(
    ({ item }: { item: PalListItem; }) => <PalDexTile pal={item} onOpen={onOpenDetails} />,
    [onOpenDetails]
  );

  const keyExtractor = useCallback((item: PalListItem) => {
    const nr = String((item as any)?.numberRaw ?? "").trim();
    const n = String((item as any)?.number ?? "").trim();
    return `${String(item.id)}:${nr || n || palDexId(item)}`;
  }, []);

  const ListEmpty = useCallback(() => {
    return (
      <View className="flex-1 items-center justify-center mt-6 px-4">
        <Text className="text-sm text-slate-400 text-center">
          No pals found in this view. Try a different search or filter.
        </Text>
      </View>
    );
  }, []);

  const FILTER_ICONS: Record<string, any> = {
    alpha: AppImages.alphaPalworldIcon,
    lucky: AppImages.luckyPalworldIcon,
    caught: AppImages.caughtPalworldIcon,
  };

  const FilterChip = useCallback(
    ({ id, label }: { id: PalDexFilter; label: string; }) => {
      const active = dexFilter === id;
      const isAll = id === 'all';

      return (
        <Pressable
          onPress={() => onChangeDexFilter(id)}
          hitSlop={8}
          className="rounded-full border"
          style={{
            width: 34,
            height: 34,
            borderColor: active ? `${ACTIVE_HIGHLIGHT}99` : "rgba(148,163,184,0.22)",
            backgroundColor: active ? `${ACTIVE_HIGHLIGHT}22` : "rgba(148,163,184,0.06)",
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isAll ? (
            <Text
              className="text-[10px] font-bold"
              style={{
                color: active ? "rgba(229,250,255,1)" : "rgba(226,232,240,0.75)",
                textAlign: 'center',
                includeFontPadding: false,
              }}
            >
              {label}
            </Text>
          ) : (
            <Image
              source={FILTER_ICONS[id]}
              style={{
                width: 18,
                height: 18,
                tintColor: active ? "rgba(229,250,255,1)" : "rgba(226,232,240,0.75)",
              }}
              contentFit="contain"
            />
          )}
        </Pressable>
      );
    },
    [dexFilter, onChangeDexFilter]
  );

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 6,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <Text
          className="text-[14px] text-slate-500"
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          Showing {filteredPals.length} / {pals.length} pals
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <FilterChip id="all" label="All" />
          <FilterChip id="caught" label="Caught" />
          <FilterChip id="lucky" label="Lucky" />
          <FilterChip id="alpha" label="Alpha" />
        </View>
      </View>

      <FlatList
        data={filteredPals}
        keyExtractor={keyExtractor}
        renderItem={renderDexItem}
        numColumns={3}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 4,
          paddingBottom: 80,
        }}
        removeClippedSubviews={false}
        initialNumToRender={24}
        maxToRenderPerBatch={24}
        windowSize={12}
        updateCellsBatchingPeriod={32}
        ListEmptyComponent={ListEmpty}
      />
    </>
  );
};

type PalDexTileProps = {
  pal: PalListItem;
  onOpen: (palId: string) => void;
};

const PalDexTile: React.FC<PalDexTileProps> = React.memo(({ pal, onOpen }) => {
  const dexId = palDexId(pal);
  const numLabel =
    String((pal as any)?.numberRaw ?? "").trim() ||
    String((pal as any)?.number ?? "").trim() ||
    String(dexId ?? "").trim();
  const displayNum = numLabel ? `#${numLabel}` : "";

  const [iconUri, setIconUri] = useState<string | null>(pal.iconUrl ?? null);
  useEffect(() => {
    setIconUri(pal.iconUrl ?? null);
  }, [pal.iconUrl]);

  const entry = usePalworldCollectionStore((s) => {
    return (s.entries[dexId] as any) ?? EMPTY_ENTRY;
  });

  const toggleCaught = usePalworldCollectionStore((s) => s.toggleCaught);
  const toggleLucky = usePalworldCollectionStore((s) => (s as any).toggleLucky);
  const toggleAlpha = usePalworldCollectionStore((s) => s.toggleAlpha);

  const caught = !!entry.caught;
  const lucky = !!entry.lucky;
  const alpha = !!entry.alpha;

  const goDetails = useCallback(() => onOpen(pal.id), [onOpen, pal.id]);

  const onToggleCaught = useCallback(() => {
    if (!dexId) return;
    toggleCaught(dexId);
  }, [dexId, toggleCaught]);

  const onToggleLucky = useCallback(() => {
    if (!dexId || !toggleLucky) return;
    toggleLucky(dexId);
  }, [dexId, toggleLucky]);

  const onToggleAlpha = useCallback(() => {
    if (!dexId) return;
    toggleAlpha(dexId);
  }, [dexId, toggleAlpha]);

  const IconToggle = ({
    active,
    iconOn,
    iconOff,
    imageSource,
    imageSize = 14,
    onPress,
  }: {
    active: boolean;
    iconOn: string;
    iconOff: string;
    imageSource?: any;
    imageSize?: number;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="mr-1.5 rounded-full border items-center justify-center"
      style={{
        width: 26,
        height: 26,
        borderColor: active ? `${ACTIVE_HIGHLIGHT}99` : "rgba(55,65,81,0.9)",
        backgroundColor: active ? `${ACTIVE_HIGHLIGHT}22` : "rgba(15,23,42,0.9)",
      }}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{
            width: imageSize,
            height: imageSize,
            tintColor: "#6b7280",
            opacity: 0.95,
          }}
          contentFit="contain"
        />
      ) : (
        <MaterialCommunityIcons name={(active ? iconOn : iconOff) as any} size={14} color="#6b7280" />
      )}
    </Pressable>
  );

  return (
    <View className="w-1/3 p-1">
      <View className="rounded-3xl p-3 border mb-1 bg-slate-900/80 border-slate-700 items-center">
        <Pressable onPress={goDetails} className="items-center">
          <RemoteIcon uri={iconUri} size={60} roundedClassName="rounded-2xl" />

          {!!displayNum && <Text className="text-[11px] text-slate-400 mt-1">{displayNum}</Text>}
          <Text className="text-xs font-semibold text-slate-50 text-center">{pal.name}</Text>
        </Pressable>

        <View className="flex-row items-center mt-2">
          <IconToggle
            active={caught}
            iconOn="pokeball"
            iconOff="pokeball"
            imageSource={AppImages.caughtPalworldIcon}
            onPress={onToggleCaught}
          />

          <IconToggle
            active={lucky}
            iconOn="star-four-points"
            iconOff="star-four-points-outline"
            imageSource={AppImages.luckyPalworldIcon}
            imageSize={20}
            onPress={onToggleLucky}
          />

          <IconToggle
            active={alpha}
            iconOn="alpha-a-circle"
            iconOff="alpha-a-circle-outline"
            imageSource={AppImages.alphaPalworldIcon}
            onPress={onToggleAlpha}
          />
        </View>
      </View>
    </View>
  );
}, arePalDexTilePropsEqual);

function arePalDexTilePropsEqual(prev: PalDexTileProps, next: PalDexTileProps) {
  return prev.pal.id === next.pal.id && prev.pal.iconUrl === next.pal.iconUrl;
}

export default PaldeckGrid;
