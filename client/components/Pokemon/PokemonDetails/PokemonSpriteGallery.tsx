// components/Pokemon/PokemonDetails/PokemonSpriteGallery.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppImages from "@/constants/images";
import LocalIcon from "@/components/LocalIcon";

export default function PokemonSpriteGallery({
  mon,
  showShiny,
  setShowShiny,
}: {
  mon: any;
  showShiny: boolean;
  setShowShiny: (v: boolean) => void;
}) {
  const frontSprite = useMemo(
    () =>
      mon
        ? showShiny
          ? mon.sprites.front_shiny ?? mon.sprites.front_default
          : mon.sprites.front_default
        : null,
    [mon, showShiny]
  );

  const backSprite = useMemo(
    () =>
      mon
        ? showShiny
          ? mon.sprites.back_shiny ?? mon.sprites.back_default
          : mon.sprites.back_default
        : null,
    [mon, showShiny]
  );

  const artGallery = useMemo(() => {
    if (!mon) return [];

    const s = mon.sprites;
    type ArtItem = { key: string; label: string; url: string };
    const items: ArtItem[] = [];
    const wantShiny = showShiny;

    const pushIf = (key: string, label: string, url: string | null | undefined, isShiny: boolean) => {
      if (!url) return;
      if (isShiny !== wantShiny) return;
      items.push({ key, label, url });
    };

    pushIf("official", "Official", s.other?.["official-artwork"]?.front_default ?? null, false);
    pushIf("official-shiny", "Official", s.other?.["official-artwork"]?.front_shiny ?? null, true);
    pushIf("home", "Home", s.other?.home?.front_default ?? null, false);
    pushIf("home-shiny", "Home", s.other?.home?.front_shiny ?? null, true);
    pushIf("showdown-front", "Showdown", s.other?.showdown?.front_default ?? null, false);
    pushIf("showdown-front-shiny", "Showdown", s.other?.showdown?.front_shiny ?? null, true);
    pushIf("showdown-back", "Showdown Back", s.other?.showdown?.back_default ?? null, false);
    pushIf("showdown-back-shiny", "Showdown Back", s.other?.showdown?.back_shiny ?? null, true);

    if (items.length === 0) {
      const normalFallback = s.front_default;
      const shinyFallback = s.front_shiny;

      if (!wantShiny && normalFallback) {
        items.push({ key: "sprite-front", label: "Sprite", url: normalFallback });
      } else if (wantShiny && (shinyFallback || normalFallback)) {
        items.push({ key: "sprite-front-shiny", label: "Sprite", url: shinyFallback ?? normalFallback! });
      }
    }

    const seen = new Set<string>();
    return items.filter((i) => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });
  }, [mon, showShiny]);

  const thumbs = useMemo(() => {
    type Thumb = { key: string; label: string; url: string };
    const out: Thumb[] = [];

    if (frontSprite) {
      out.push({
        key: "thumb-front",
        label: showShiny ? "Front shiny" : "Front",
        url: frontSprite,
      });
    }

    if (backSprite) {
      out.push({
        key: "thumb-back",
        label: showShiny ? "Back shiny" : "Back",
        url: backSprite,
      });
    }

    for (const art of artGallery) {
      out.push({
        key: `art-${art.key}`,
        label: art.label,
        url: art.url,
      });
    }

    return out;
  }, [frontSprite, backSprite, artGallery, showShiny]);

  const officialArt =
    mon?.sprites?.other?.["official-artwork"]?.front_default ?? mon?.sprites?.front_default ?? null;

  const shinyArt =
    mon?.sprites?.other?.["official-artwork"]?.front_shiny ?? mon?.sprites?.front_shiny ?? null;

  const mainArt = showShiny && shinyArt ? shinyArt : officialArt;

  const [selectedHeroUrl, setSelectedHeroUrl] = useState<string | null>(null);
  const heroImageUrl = selectedHeroUrl ?? mainArt;

  const [heroLoading, setHeroLoading] = useState(false);

  useEffect(() => {
    if (!heroImageUrl) return;

    setHeroLoading(true);

    const id = requestAnimationFrame(() => {
      setHeroLoading(false);
    });

    return () => cancelAnimationFrame(id);
  }, [heroImageUrl]);

  useEffect(() => {
    setSelectedHeroUrl(null);
  }, [mon, showShiny]);

  const hasAnything = !!heroImageUrl || thumbs.length > 0;
  if (!hasAnything) return null;

  const THUMB_ROW_H = 72;
  const PANEL_MAX_H = THUMB_ROW_H * 3;

  const canShowShiny = !!shinyArt || !!mon?.sprites?.front_shiny || !!mon?.sprites?.back_shiny;

  const toggleLabel = showShiny ? "Normal" : "Shiny";

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-center px-4 min-h-[240px]">
        <View className="items-center justify-center">
          {heroImageUrl ? (
            <View className="items-center justify-center relative">
              <ExpoImage
                source={{ uri: heroImageUrl }}
                style={{ width: 260, height: 260 }}
                contentFit="contain"
                transition={120}
                cachePolicy="disk"
              />

              {heroLoading && (
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator />
                </View>
              )}
            </View>
          ) : (
            <View className="w-[200px] h-[200px] rounded-3xl bg-slate-950/90 border border-slate-800 items-center justify-center">
              <MaterialCommunityIcons name="image-off-outline" size={40} color="#64748b" />
            </View>
          )}
        </View>

        {thumbs.length > 0 && (
          <View className="ml-4">
            {canShowShiny && (
              <TouchableOpacity
                onPress={() => setShowShiny(!showShiny)}
                className="mb-2 self-center rounded-full bg-slate-900 border border-slate-700 px-3 py-1 flex-row items-center"
              >
                {toggleLabel === "Shiny" ? (
                  <LocalIcon
                    source={AppImages.shinyPokemonIcon}
                    size={14}
                    style={{ tintColor: "#facc15" }}
                    contentFit="contain"
                  />
                ) : (
                  <MaterialCommunityIcons name="circle-outline" size={14} color="#e5e7eb" />
                )}

                <Text className="ml-1 text-[11px] font-semibold" style={{ color: toggleLabel === "Shiny" ? "#facc15" : "#e5e7eb" }}>
                  {toggleLabel}
                </Text>
              </TouchableOpacity>
            )}

            <View
              className="rounded-2xl bg-slate-900/80 border border-slate-700 px-2 py-2"
              style={{ maxHeight: PANEL_MAX_H, width: 90 }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {thumbs.map((t) => {
                  const isActive = selectedHeroUrl === t.url || (!selectedHeroUrl && t.url === mainArt);

                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setSelectedHeroUrl(t.url)}
                      style={{
                        borderRadius: 14,
                        padding: 4,
                        borderWidth: 1.5,
                        borderColor: isActive ? "#38bdf8" : "transparent",
                      }}
                    >
                      <View className="items-center">
                        <ExpoImage
                          source={{ uri: t.url }}
                          style={{ width: 70, height: 70 }}
                          contentFit="contain"
                          transition={120}
                          cachePolicy="disk"
                        />

                        <Text className="text-[10px] text-slate-300 text-center" numberOfLines={1}>
                          {t.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
