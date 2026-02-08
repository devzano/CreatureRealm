// components/Palworld/PalworldDetails/PalOverviewSection.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type PalDetail } from "@/lib/palworld/pal/paldbDetails";
import Section from "@/components/Section";

export type PalOverviewSectionProps = {
  data: PalDetail;
  accent: string;

  partnerLv: number;
  partnerLevels: number[];
  setPartnerLv: (n: number) => void;

  work: Array<{ name: string; level: string; iconUrl?: string | null }>;
  importantStats: Array<{ key: string; value: any; iconUrl?: string | null }>;

  movement?: Record<string, string>;
  level65?: Record<string, string>;
};

function safeEncodeUrl(u?: string) {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  try {
    return encodeURI(s);
  } catch {
    return s;
  }
}

function isPaldbCdn(url: string) {
  return /^https?:\/\/cdn\.paldb\.cc\//i.test(url);
}

function buildPaldbImageSource(url?: string | null) {
  const u = safeEncodeUrl(url ?? undefined);
  if (!u) return undefined;

  if (isPaldbCdn(u)) {
    return {
      uri: u,
      headers: {
        Referer: "https://paldb.cc/",
        Origin: "https://paldb.cc",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    } as const;
  }

  return u;
}

const IconPlaceholder = ({ size = 18 }: { size?: number }) => (
  <View
    style={{ width: size, height: size, borderRadius: 6 }}
    className="bg-slate-800/50 border border-slate-700"
  />
);

function normalizeSizeToken(v: any) {
  const raw = String(v ?? "").trim().toLowerCase();

  // expected: xs, s, m, l, xl, xxl, xxxl
  if (raw === "xs") return "xs";
  if (raw === "s") return "s";
  if (raw === "m") return "m";
  if (raw === "l") return "l";
  if (raw === "xl") return "xl";
  if (raw === "xxl") return "xxl";
  if (raw === "xxxl") return "xxxl";

  // fallbacks (in case paldb uses variants)
  if (raw.includes("xxx")) return "xxxl";
  if (raw.includes("xx")) return "xxl";
  if (raw.includes("xl")) return "xl";
  if (raw.includes("xs")) return "xs";

  return null;
}

const StatIcon = ({
  statKey,
  statValue,
  iconUrl,
  size = 18,
}: {
  statKey: string;
  statValue: any;
  iconUrl?: string | null;
  size?: number;
}) => {
  if (statKey === "Rarity") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          marginRight: 8,
        }}
        className="items-center justify-center"
      >
        <MaterialCommunityIcons name="diamond" size={14} color="#fff" />
      </View>
    );
  }

  if (statKey === "Size") {
    const tok = normalizeSizeToken(statValue);
    const iconName = tok ? (`size-${tok}` as any) : null;

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          marginRight: 8,
        }}
        className="items-center justify-center"
      >
        {iconName ? (
          <MaterialCommunityIcons name={iconName} size={18} color="#fff" />
        ) : (
          <MaterialCommunityIcons name="resize" size={14} color="#fff" />
        )}
      </View>
    );
  }

  if (iconUrl) {
    return (
      <Image
        source={buildPaldbImageSource(iconUrl) as any}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          marginRight: 8,
        }}
        contentFit="contain"
        transition={120}
        cachePolicy="disk"
      />
    );
  }

  return (
    <View style={{ marginRight: 8 }}>
      <IconPlaceholder size={size} />
    </View>
  );
};

function prettyKey(k: string) {
  const s = String(k ?? "").trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// -----------------------------
// FOOD ICONS (ON only)
// -----------------------------
const FOOD_ICON_ON =
  "https://cdn.paldb.cc/image/Pal/Texture/UI/Main_Menu/T_Icon_foodamount_on.webp";

const FoodIcons = ({ amount }: { amount: number }) => {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return (
    <View className="flex-row items-center mt-2 flex-wrap">
      {Array.from({ length: amount }).map((_, i) => (
        <Image
          key={`food-${i}`}
          source={buildPaldbImageSource(FOOD_ICON_ON) as any}
          style={{
            width: 16,
            height: 16,
            marginRight: 4,
            marginBottom: 4,
          }}
          contentFit="contain"
          transition={120}
          cachePolicy="disk"
        />
      ))}
    </View>
  );
};

export const PalOverviewSection: React.FC<PalOverviewSectionProps> = ({
  data,
  accent,
  partnerLv,
  partnerLevels,
  setPartnerLv,
  work,
  importantStats,
  movement,
  level65,
}) => {
  const movementMap = movement ?? data.movement;
  const level65Map = level65 ?? data.level65;

  const hasKeyValue =
    Object.keys(movementMap ?? {}).length > 0 ||
    Object.keys(level65Map ?? {}).length > 0;

  const activeRows = ((data as any)?.partnerSkillActiveStats ?? []) as Array<any>;

  const selectedLv =
    partnerLv || (partnerLevels.length > 0 ? partnerLevels[0] : 0) || 0;

  const filteredActive = activeRows.filter((r) => {
    if (!selectedLv) return true;
    return Number(r?.level ?? 0) === Number(selectedLv);
  });

  const hasPartnerSkillBlock =
    !!data.partnerSkillName ||
    !!data.partnerSkillDescription ||
    (data.partnerSkillEffects ?? []).length > 0 ||
    (data.ranchDrops ?? []).length > 0 ||
    !!(data as any)?.partnerSkillTechnology ||
    activeRows.length > 0;

  return (
    <View className="mb-4">
      <Section
        borderColor={accent}
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Overview
            </Text>
          </View>
        }
      >
        <>
          {data.summary ? (
            <View className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider">
                  Summary
                </Text>
              </View>

              <Text className="text-[13px] leading-5 text-slate-300">
                {data.summary}
              </Text>
            </View>
          ) : null}

          {hasPartnerSkillBlock ? (
            <View className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
              {(() => {
                const selectedLv =
                  partnerLv ||
                  (partnerLevels.length > 0 ? partnerLevels[0] : 0) ||
                  0;

                const activeRows = ((data as any)?.partnerSkillActiveStats ??
                  []) as Array<any>;

                const filteredActive = activeRows.filter((r) => {
                  if (!selectedLv) return true;
                  return Number(r?.level ?? 0) === Number(selectedLv);
                });

                return (
                  <>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider">
                        Partner Skill
                      </Text>

                      {data.partnerSkillLevel || partnerLevels.length > 0 ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            if (partnerLevels.length <= 1) return;

                            const idx = partnerLevels.indexOf(selectedLv);
                            const safeIdx = idx >= 0 ? idx : 0;
                            const next =
                              partnerLevels[(safeIdx + 1) % partnerLevels.length];
                            setPartnerLv(next);
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{
                            alignSelf: "flex-start",
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "rgba(56, 189, 248, 0.35)",
                            backgroundColor: "rgba(14, 165, 233, 0.18)",
                          }}
                        >
                          <Text className="text-[10px] text-sky-200 font-bold">
                            {selectedLv
                              ? `Lv ${selectedLv}`
                              : data.partnerSkillLevel}
                            {partnerLevels.length > 1 ? "  ↻" : ""}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View className="flex-row items-center mb-1">
                      {data.partnerSkillIconUrl ? (
                        <Image
                          source={
                            buildPaldbImageSource(data.partnerSkillIconUrl) as any
                          }
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            marginRight: 8,
                          }}
                          contentFit="contain"
                          transition={120}
                          cachePolicy="disk"
                        />
                      ) : (
                        <View style={{ marginRight: 8 }}>
                          <IconPlaceholder size={22} />
                        </View>
                      )}

                      <Text className="text-[15px] text-slate-100 font-bold">
                        {data.partnerSkillName ?? "-"}
                      </Text>
                    </View>

                    {data.partnerSkillDescription ? (
                      <Text className="text-[13px] leading-5 text-slate-300">
                        {data.partnerSkillDescription}
                      </Text>
                    ) : null}

                    {data.partnerSkillTechnology?.technology ? (
                      <View className="mt-3 pt-3 border-t border-slate-800/50">
                        <Text className="text-[11px] font-semibold text-slate-500 mb-2">
                          TECHNOLOGY
                        </Text>

                        <View className="flex-row items-center justify-between py-1">
                          <View className="flex-row items-center flex-1 pr-3">
                            {data.partnerSkillTechnology?.itemIconUrl ? (
                              <Image
                                source={
                                  buildPaldbImageSource(
                                    data.partnerSkillTechnology.itemIconUrl
                                  ) as any
                                }
                                style={{
                                  width: 22,
                                  height: 22,
                                  marginRight: 8,
                                  borderRadius: 6,
                                }}
                                contentFit="contain"
                                transition={120}
                                cachePolicy="disk"
                              />
                            ) : (
                              <View style={{ marginRight: 8 }}>
                                <IconPlaceholder size={22} />
                              </View>
                            )}

                            <View>
                              <Text className="text-[12px] text-slate-100 font-semibold">
                                Unlock Item
                              </Text>
                              <Text className="text-[11px] text-slate-400">
                                {data.partnerSkillTechnology?.itemName
                                  ? data.partnerSkillTechnology.itemName
                                  : data.partnerSkillTechnology?.itemSlug
                                  ? data.partnerSkillTechnology.itemSlug.replace(
                                      /_/g,
                                      " "
                                    )
                                  : "-"}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={{
                              alignSelf: "flex-start",
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: "rgba(56, 189, 248, 0.25)",
                              backgroundColor: "rgba(15, 23, 42, 0.65)",
                            }}
                          >
                            <Text className="text-[10px] text-slate-100 font-bold">
                              Tech {data.partnerSkillTechnology.technology}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {(data.partnerSkillEffects ?? []).length > 0 ? (
                      <View className="mt-3 pt-3 border-t border-slate-800/50">
                        <Text className="text-[11px] font-semibold text-slate-500 mb-2">
                          EFFECT SCALING
                        </Text>

                        {(() => {
                          const effects = [...(data.partnerSkillEffects ?? [])]
                            .filter((e) => e && e.level != null)
                            .sort((a, b) => Number(a.level) - Number(b.level));

                          if (effects.length === 0) return null;

                          if (!selectedLv) {
                            return effects.map((e, idx) => (
                              <View
                                key={`${e.level}-${idx}`}
                                className="flex-row items-center justify-between py-1"
                              >
                                <Text className="text-[12px] text-slate-300 flex-1 pr-3">
                                  {e.description}
                                </Text>

                                <Text className="text-[12px] text-slate-100 font-semibold">
                                  {e.value ? e.value : `Lv ${e.level}`}
                                </Text>
                              </View>
                            ));
                          }

                          const carriedEffect =
                            [...effects]
                              .reverse()
                              .find(
                                (e) => Number(e.level) <= Number(selectedLv)
                              ) ?? effects[effects.length - 1];

                          return (
                            <View className="flex-row items-center justify-between py-1">
                              <Text className="text-[12px] text-slate-300 flex-1 pr-3">
                                {carriedEffect.description}
                              </Text>

                              <Text className="text-[12px] text-slate-100 font-semibold">
                                {carriedEffect.value
                                  ? carriedEffect.value
                                  : `Lv ${carriedEffect.level}`}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                    ) : null}

                    {filteredActive.length > 0 ? (
                      <View className="mt-3 pt-3 border-t border-slate-800/50">
                        <Text className="text-[11px] font-semibold text-slate-500 mb-2">
                          ACTIVE STATS
                        </Text>

                        {filteredActive.map((row, idx) => {
                          const valuesFromRow =
                            (row?.values && typeof row.values === "object"
                              ? row.values
                              : null) ??
                            Object.fromEntries(
                              Object.entries(row ?? {}).filter(
                                ([k]) => k !== "level" && k !== "values"
                              )
                            );

                          const entries = Object.entries(valuesFromRow ?? {});
                          return (
                            <View
                              key={`active-${row.level}-${idx}`}
                              className="flex-row items-center justify-between py-1"
                            >
                              <View className="flex-1 pr-3">
                                {entries.length > 0 ? (
                                  <>
                                    {entries.map(([k, v], j) => (
                                      <View
                                        key={`active-${row.level}-${k}-${j}`}
                                        className="flex-row items-center justify-between"
                                      >
                                        <Text className="text-[12px] text-slate-300">
                                          {prettyKey(k)}
                                        </Text>
                                        <Text className="text-[12px] text-slate-100 font-semibold">
                                          {String(v)}
                                        </Text>
                                      </View>
                                    ))}
                                  </>
                                ) : (
                                  <Text className="text-[12px] text-slate-300">
                                    -
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    {(data.ranchDrops ?? []).length > 0 ? (
                      <View className="mt-3 pt-3 border-t border-slate-800/50">
                        <Text className="text-[11px] font-semibold text-slate-500 mb-2">
                          RANCH DROPS
                        </Text>

                        {(data.ranchDrops ?? [])
                          .filter((d) => (selectedLv ? d.level === selectedLv : true))
                          .map((d, idx) => (
                            <View
                              key={`${d.level}-${d.item}-${idx}`}
                              className="flex-row items-center justify-between py-1"
                            >
                              <View className="flex-row items-center flex-1 pr-3">
                                {d.iconUrl ? (
                                  <Image
                                    source={buildPaldbImageSource(d.iconUrl) as any}
                                    style={{
                                      width: 22,
                                      height: 22,
                                      marginRight: 8,
                                      borderRadius: 6,
                                    }}
                                    contentFit="contain"
                                    transition={120}
                                    cachePolicy="disk"
                                  />
                                ) : (
                                  <View style={{ marginRight: 8 }}>
                                    <IconPlaceholder size={22} />
                                  </View>
                                )}

                                <View>
                                  <Text className="text-[12px] text-slate-100 font-semibold">
                                    {d.item}
                                  </Text>

                                  <View className="flex-row items-center">
                                    <Text className="text-[11px] text-slate-400">
                                      {d.amount}
                                    </Text>
                                    <Text className="text-[11px] text-slate-600 mx-1.5">
                                      •
                                    </Text>
                                    <Text className="text-[11px] text-slate-400">
                                      {d.probability}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              <Text className="text-[12px] text-slate-100 font-semibold">
                                Lv {d.level}
                              </Text>
                            </View>
                          ))}
                      </View>
                    ) : null}
                  </>
                );
              })()}
            </View>
          ) : null}

          {importantStats.length > 0 || work.length > 0 ? (
            <View className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
              <View className="flex-row">
                {importantStats.length > 0 && (
                  <View className="flex-1 pr-4 border-r border-slate-800/50">
                    <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
                      Key Stats
                    </Text>

                    <View className="space-y-0.5">
                      {importantStats.map((s) => (
                        <View
                          key={s.key}
                          className="flex-row items-center justify-between py-1"
                        >
                          <View className="flex-row items-center flex-1 pr-3">
                            <StatIcon
                              statKey={s.key}
                              statValue={s.value}
                              iconUrl={s.iconUrl ?? null}
                              size={18}
                            />
                            <Text className="text-[12px] text-slate-400">
                              {s.key}
                            </Text>
                          </View>

                          <Text className="text-[12px] text-slate-100 font-semibold">
                            {s.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {work.length > 0 && (
                  <View className="flex-1 pl-4">
                    <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
                      Work Suitability
                    </Text>

                    <View className="space-y-0.5">
                      {work.map((w, idx) => (
                        <View
                          key={`${w.name}-${idx}`}
                          className="flex-row items-center justify-between py-1"
                        >
                          <View className="flex-row items-center flex-1 pr-3">
                            {w.iconUrl ? (
                              <Image
                                source={buildPaldbImageSource(w.iconUrl) as any}
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 6,
                                  marginRight: 8,
                                }}
                                contentFit="contain"
                                transition={120}
                                cachePolicy="disk"
                              />
                            ) : (
                              <View style={{ marginRight: 8 }}>
                                <IconPlaceholder size={18} />
                              </View>
                            )}

                            <Text className="text-[12px] text-slate-300">
                              {w.name}
                            </Text>
                          </View>

                          <Text className="text-[12px] text-slate-100 font-bold">
                            Lv {w.level}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* FOOD (icons only, ON count) */}
                    {data.food?.amount ? (
                      <View className="mt-3 pt-2 border-t border-slate-800/50">
                        <Text className="text-[11px] font-semibold text-slate-500 mb-1">
                          FOOD
                        </Text>
                        <FoodIcons amount={data.food.amount} />
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {hasKeyValue ? (
            <View className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
              <View className="flex-row">
                {Object.keys(level65Map ?? {}).length > 0 && (
                  <View className="flex-1 pr-4 border-r border-slate-800/50">
                    <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
                      Level 65
                    </Text>

                    <View className="space-y-0.5">
                      {Object.entries(level65Map ?? {}).map(([k, v]) => {
                        const iconUrl =
                          importantStats.find((s) => s.key === k)?.iconUrl ?? null;

                        return (
                          <View
                            key={`level65-${k}`}
                            className="flex-row items-center justify-between py-1"
                          >
                            <View className="flex-row items-center flex-1 pr-3">
                              <StatIcon
                                statKey={k}
                                statValue={v}
                                iconUrl={iconUrl}
                                size={18}
                              />
                              <Text className="text-[12px] text-slate-400">
                                {k}
                              </Text>
                            </View>

                            <Text className="text-[12px] text-slate-100 font-semibold">
                              {v}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {Object.keys(movementMap ?? {}).length > 0 && (
                  <View
                    className={`flex-1 ${
                      Object.keys(level65Map ?? {}).length > 0 ? "pl-4" : ""
                    }`}
                  >
                    <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
                      Movement
                    </Text>

                    <View className="space-y-0.5">
                      {Object.entries(movementMap ?? {}).map(([k, v]) => (
                        <View
                          key={`movement-${k}`}
                          className="flex-row items-center justify-between py-1"
                        >
                          <Text className="text-[12px] text-slate-400 flex-1 pr-3">
                            {k}
                          </Text>

                          <Text className="text-[12px] text-slate-100 font-semibold">
                            {v}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </>
      </Section>
    </View>
  );
};

export default PalOverviewSection;
