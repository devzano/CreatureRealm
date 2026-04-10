import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { POKOPIA_FAVORITES } from "./config";
import PokopiaFavoriteDetailSheet from "./PokopiaFavoriteDetailSheet";
import { getPokopiaFavoriteTheme } from "./favoritePresentation";
import { PokopiaEmptyState } from "./PokopiaContentStates";

export default function PokopiaFavoritesContent() {
  const [search, setSearch] = useState("");
  const [selectedFavoriteLabel, setSelectedFavoriteLabel] = useState<string | null>(null);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const filteredFavorites = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return POKOPIA_FAVORITES;
    return POKOPIA_FAVORITES.filter((favorite) =>
      favorite.label.toLowerCase().includes(normalized)
    );
  }, [search]);

  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return (
    <View className="flex-1 px-2 pt-4">
      <View className="mb-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search favorites..."
          placeholderTextColor="rgba(148,163,184,0.8)"
          className="h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-[13px] text-slate-100"
        />
      </View>

      {!filteredFavorites.length ? (
        <PokopiaEmptyState
          title="No favorites to show"
          message="Try a different search term."
        />
      ) : (
        <View className="flex-row flex-wrap -mx-1">
          {filteredFavorites.map((favorite) => {
            const theme = getPokopiaFavoriteTheme(favorite.label, favorite.href);

            return (
              <View key={favorite.slug} className="w-1/3 px-1 mb-2">
                <Pressable
                  onPress={() => {
                    setSelectedFavoriteLabel(favorite.label);
                    setSelectedFavoriteSlug(favorite.slug);
                    setSheetVisible(true);
                  }}
                  className="rounded-3xl border overflow-hidden"
                  style={{
                    minHeight: 110,
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  }}
                >
                  <View className="px-4 py-4 flex-1 justify-between">
                    <Text className="text-[14px] font-semibold leading-5" style={{ color: theme.text }}>
                      {toTitleCase(favorite.label)}
                    </Text>
                    <Text className="text-[11px] font-semibold mt-3" style={{ color: theme.hint }}>
                      Tap to Explore
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <PokopiaFavoriteDetailSheet
        visible={sheetVisible}
        favoriteLabel={selectedFavoriteLabel}
        favoriteSlug={selectedFavoriteSlug}
        onRequestClose={() => {
          setSheetVisible(false);
          setSelectedFavoriteLabel(null);
          setSelectedFavoriteSlug(null);
        }}
      />
    </View>
  );
}
