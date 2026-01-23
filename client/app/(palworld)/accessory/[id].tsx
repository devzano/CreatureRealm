// app/(palworld)/accessory/[id].tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import RemoteIcon from "@/components/RemoteIcon";
import Section from "@/components/Section";

import {
  fetchAccessoryList,
  fetchAccessoryDetail,
  type AccessoryIndexItem as AccessoryListItem,
  type AccessoryDetail,
  type TreantNode,
  type DetailRecipeRow,
  type DroppedByRow,
  type TreasureBoxRow,
  type MerchantRow,
  type KeyValueRow,
} from "@/lib/palworld/items/paldbAccessory";

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function prettyRarity(r?: string | null) {
  const s = (r ?? "").trim();
  return s || "Common";
}

function slugToKind(slug: string) {
  const s = (slug ?? "").trim();
  if (!s) return "Unknown";

  const last = s.split("/").filter(Boolean).slice(-1)[0] ?? s;
  const base = last.replace(/[#?].*$/, "");
  return base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function isWorkIngredient(m: any) {
  const slug = String(m?.slug ?? "");
  if (slug === "__work__") return true;
  const icon = String(m?.iconUrl ?? "");
  return icon.includes("T_icon_status_05");
}

function filterOutWorkFromRecipeRows(rows: DetailRecipeRow[]) {
  const arr = Array.isArray(rows) ? rows : [];
  return arr
    .map((row) => {
      const mats = Array.isArray(row?.materials) ? row.materials : [];
      const filtered = mats.filter((m) => !isWorkIngredient(m));
      return { ...row, materials: filtered };
    })
    // If a row was ONLY "Work", drop it
    .filter((row) => (row.materials?.length ?? 0) > 0 || row.product != null || !!row.schematicText);
}

function renderTreant(node: TreantNode, depth: number) {
  const pad = Math.min(22, depth * 12);
  const qtyLabel = node?.qty != null ? `x${node.qty}` : "—";

  return (
    <View key={`${node.slug ?? "node"}:${depth}:${node.iconUrl ?? ""}`} style={{ marginLeft: pad }}>
      <View className="flex-row items-center py-1">
        <RemoteIcon
          uri={node.iconUrl ?? null}
          size={18}
          roundedClassName="rounded-md"
          placeholderClassName="bg-white/5 border border-white/10"
          contentFit="contain"
        />
        <Text className="ml-2 text-white/85 text-[12px]">{qtyLabel}</Text>

        {!!node.slug && (
          <Text className="text-white/35 text-[11px] ml-2" numberOfLines={1}>
            {node.slug}
          </Text>
        )}
      </View>

      {!!node.children?.length && node.children.map((c) => renderTreant(c, depth + 1))}
    </View>
  );
}

function statFillIconName(key: string): string {
  const k = (key ?? "").toLowerCase().trim();

  if (k.includes("gold") || k.includes("coin") || k.includes("price") || k.includes("sell") || k.includes("buy")) {
    return "cash";
  }

  if (k.includes("rarity")) return "star-circle";
  if (k === "type" || k.includes("category")) return "shape";
  if (k.includes("rank")) return "trophy";
  if (k.includes("code") || k.includes("id")) return "barcode";

  if (k.includes("weight")) return "weight-kilogram";
  if (k.includes("max stack") || k.includes("maxstack") || k.includes("stack")) return "layers";
  if (k.includes("durability")) return "shield";
  if (k.includes("cooldown")) return "timer";
  if (k.includes("work") || k.includes("workload")) return "hammer";
  if (k.includes("attack")) return "sword";
  if (k.includes("defense")) return "shield-star";
  if (k.includes("hp") || k.includes("health")) return "heart";
  if (k.includes("stamina")) return "run-fast";

  if (k.includes("technology") || k.includes("tech")) return "atom";
  if (k.includes("required") || k.includes("needed")) return "clipboard-check";

  return "information";
}

export default function PalworldAccessoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AccessoryListItem | null>(null);
  const [detail, setDetail] = useState<AccessoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const list = await fetchAccessoryList();

        const idTrim = String(id).trim();
        const found =
          list.find((x: AccessoryListItem) => String(x.slug).trim() === idTrim) ??
          list.find((x: AccessoryListItem) => String(x.slug).trim().endsWith(idTrim));

        const d = await fetchAccessoryDetail(idTrim);

        if (!mounted) return;
        setItem(found ?? null);
        setDetail(d ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ? String(e.message) : "Failed to load accessory.");
        setItem(null);
        setDetail(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const title = useMemo(() => item?.name ?? "Accessory", [item?.name]);
  const subtitle = useMemo(() => "Palworld", []);

  const kind = useMemo(() => slugToKind(String(id ?? "")), [id]);
  const rarity = useMemo(() => prettyRarity(item?.rarity ?? null), [item?.rarity]);

  const tech = safeNum(item?.technology);

  const description = detail?.description ?? item?.description ?? null;
  const effects = detail?.effects ?? [];

  const treant = detail?.treant ?? null;

  const stats = detail?.stats ?? [];
  const others = detail?.others ?? [];

  const producedAt = detail?.producedAt ?? [];

  const production = useMemo(() => filterOutWorkFromRecipeRows(detail?.production ?? []), [detail?.production]);
  const craftingMaterials = useMemo(
    () => filterOutWorkFromRecipeRows(detail?.craftingMaterials ?? []),
    [detail?.craftingMaterials]
  );

  const droppedBy = detail?.droppedBy ?? [];
  const treasureBox = detail?.treasureBox ?? [];
  const wanderingMerchant = detail?.wanderingMerchant ?? [];

  const pill = useCallback((label: string, value: string) => {
    return (
      <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
        <Text className="text-white/80 text-[12px]">
          {label}: <Text className="text-white">{value}</Text>
        </Text>
      </View>
    );
  }, []);

  function KeyValueRows({ rows }: { rows: KeyValueRow[] }) {
    if (!rows?.length) return null;

    return (
      <View className="overflow-hidden">
        {rows.map((r, idx) => {
          const iconUrl = r?.keyItem?.iconUrl ?? r?.keyIconUrl ?? null;
          const iconName = statFillIconName(String(r?.key ?? ""));

          return (
            <View
              key={`${r?.key ?? "k"}:${idx}`}
              className={[
                "flex-row items-center justify-between py-3",
                idx !== rows.length - 1 ? "border-b border-white/5" : "",
              ].join(" ")}
            >
              <View className="flex-row items-center flex-1 pr-3">
                {iconUrl ? (
                  <RemoteIcon
                    uri={iconUrl}
                    size={22}
                    roundedClassName="rounded-md"
                    placeholderClassName="bg-white/5 border border-white/10"
                    contentFit="contain"
                  />
                ) : (
                  <View className="w-[22px] h-[22px] items-center justify-center">
                    <MaterialCommunityIcons name={iconName as any} size={18} color="rgba(255,255,255,0.75)" />
                  </View>
                )}

                <Text className="ml-3 text-white/85 text-[13px]" numberOfLines={1}>
                  {r?.key ?? "—"}
                </Text>
              </View>

              <Text className="text-white/70 text-[13px]" numberOfLines={1}>
                {r?.valueText ?? r?.valueItem?.name ?? "—"}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  function AboutSection({
    description,
    effects,
    stats,
  }: {
    description: string | null;
    effects: string[];
    stats: KeyValueRow[];
  }) {
    const hasDesc = !!(description ?? "").trim();
    const hasEffects = !!effects?.length;
    const hasStats = !!stats?.length;

    if (!hasDesc && !hasEffects && !hasStats) return null;

    return (
      <View className="mt-4">
        <Section title="About">
          <View>
            {!!hasDesc && <Text className="text-white/80 text-[13px] leading-5">{description}</Text>}

            {!!hasEffects && (
              <View className={hasDesc ? "mt-4 pt-4 border-t border-white/5" : ""} style={{ gap: 8 }}>
                <Text className="text-white/60 text-[11px] mb-1">Effects</Text>

                {effects.map((e, idx) => (
                  <View
                    key={`${e}:${idx}`}
                    className="px-3 py-2 rounded-2xl border border-white/10 bg-white/[0.03]"
                  >
                    <Text className="text-white/85 text-[13px] leading-5">{e}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!hasStats && (
              <View className={hasDesc || hasEffects ? "mt-4 pt-4 border-t border-white/5" : ""}>
                <Text className="text-white/60 text-[11px] mb-2">Stats</Text>
                <KeyValueRows rows={stats} />
              </View>
            )}
          </View>
        </Section>
      </View>
    );
  }

  function OthersSection({ rows }: { rows: KeyValueRow[] }) {
    if (!rows?.length) return null;
    return (
      <View className="mt-6">
        <Section title="Others">
          <KeyValueRows rows={rows} />
        </Section>
      </View>
    );
  }

  function ProducedAtSection({ rows }: { rows: { slug: string; name: string; iconUrl: string | null }[] }) {
    if (!rows?.length) return null;
    return (
      <View className="mt-4">
        <Section title="Produced At">
          <View className="flex-row flex-wrap gap-2">
            {rows.map((p) => (
              <View
                key={p.slug}
                className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5"
              >
                <RemoteIcon
                  uri={p.iconUrl}
                  size={18}
                  roundedClassName="rounded-md"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="contain"
                />
                <Text className="ml-2 text-white/85 text-[12px]" numberOfLines={1}>
                  {p.name}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </View>
    );
  }

  function RecipeSection({ title, rows }: { title: string; rows: DetailRecipeRow[] }) {
    if (!rows?.length) return null;

    return (
      <View className="mt-4">
        <Section title={title}>
          <View className="overflow-hidden">
            {rows.map((row, idx) => (
              <View
                key={`${row.product?.slug ?? "row"}:${idx}`}
                className={["py-4", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <RemoteIcon
                      uri={row.product?.iconUrl ?? null}
                      size={30}
                      roundedClassName="rounded-xl"
                      placeholderClassName="bg-white/5 border border-white/10"
                    />
                    <Text className="ml-3 text-white/90 text-[14px] font-semibold" numberOfLines={1}>
                      {row.product?.name ?? "—"}
                    </Text>

                    {row.product?.qty != null ? (
                      <Text className="text-white/60 text-[12px] ml-2">x{row.product.qty}</Text>
                    ) : null}
                  </View>

                  {!!row.schematicText && (
                    <Text className="text-white/55 text-[12px] ml-3" numberOfLines={1}>
                      {row.schematicText}
                    </Text>
                  )}
                </View>

                {!!row.materials?.length && (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {row.materials.map((m) => (
                      <View
                        key={m.slug}
                        className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5"
                      >
                        <RemoteIcon
                          uri={m.iconUrl ?? null}
                          size={18}
                          roundedClassName="rounded-md"
                          placeholderClassName="bg-white/5 border border-white/10"
                          contentFit="contain"
                        />
                        <Text className="ml-2 text-white/85 text-[12px]" numberOfLines={1}>
                          {m.name}
                        </Text>

                        {m.qty != null ? (
                          <Text className="text-white/60 text-[12px] ml-2">x{m.qty}</Text>
                        ) : m.qtyText ? (
                          <Text className="text-white/60 text-[12px] ml-2">{m.qtyText}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </Section>
      </View>
    );
  }

  function DroppedBySection({ rows }: { rows: DroppedByRow[] }) {
    if (!rows?.length) return null;

    return (
      <View className="mt-4">
        <Section title="Dropped By">
          <View className="overflow-hidden">
            {rows.map((r, idx) => (
              <View
                key={`${r.pal?.slug ?? "pal"}:${idx}`}
                className={[
                  "flex-row items-center justify-between py-3",
                  idx !== rows.length - 1 ? "border-b border-white/5" : "",
                ].join(" ")}
              >
                <View className="flex-row items-center flex-1">
                  <RemoteIcon
                    uri={r.pal?.iconUrl ?? null}
                    size={30}
                    roundedClassName="rounded-full"
                    placeholderClassName="bg-white/5 border border-white/10"
                  />
                  <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                    {r.pal?.name ?? "—"}
                  </Text>
                </View>

                <View className="items-end ml-3">
                  <Text className="text-white/70 text-[12px]" numberOfLines={1}>
                    {r.qtyText ?? "—"}
                  </Text>
                  <Text className="text-white/45 text-[11px]" numberOfLines={1}>
                    {r.probabilityText ?? "—"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>
      </View>
    );
  }

  function TreasureBoxSection({ rows }: { rows: TreasureBoxRow[] }) {
    if (!rows?.length) return null;

    return (
      <View className="mt-4">
        <Section title="Treasure Box">
          <View className="overflow-hidden">
            {rows.map((r, idx) => (
              <View
                key={`${r.item?.slug ?? "tb"}:${idx}`}
                className={["py-4", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <RemoteIcon
                      uri={r.item?.iconUrl ?? null}
                      size={30}
                      roundedClassName="rounded-xl"
                      placeholderClassName="bg-white/5 border border-white/10"
                    />
                    <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                      {r.item?.name ?? "—"}
                    </Text>
                    {!!r.qtyText && (
                      <Text className="text-white/60 text-[12px] ml-2" numberOfLines={1}>
                        x{r.qtyText}
                      </Text>
                    )}
                  </View>
                </View>

                {!!r.sourceText && (
                  <Text className="text-white/50 text-[12px] mt-2" numberOfLines={3}>
                    {r.sourceText}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Section>
      </View>
    );
  }

  function WanderingMerchantSection({ rows }: { rows: MerchantRow[] }) {
    if (!rows?.length) return null;

    return (
      <View className="mt-4">
        <Section title="Wandering Merchant">
          <View className="overflow-hidden">
            {rows.map((r, idx) => (
              <View
                key={`${r.item?.slug ?? "wm"}:${idx}`}
                className={["py-4", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <RemoteIcon
                      uri={r.item?.iconUrl ?? null}
                      size={30}
                      roundedClassName="rounded-xl"
                      placeholderClassName="bg-white/5 border border-white/10"
                    />
                    <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                      {r.item?.name ?? "—"}
                    </Text>
                  </View>
                </View>

                {!!r.sourceText && (
                  <Text className="text-white/50 text-[12px] mt-2" numberOfLines={3}>
                    {r.sourceText}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Section>
      </View>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Accessory" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-slate-300 text-center">{error}</Text>
          <Text className="text-[12px] text-slate-500 text-center mt-2">Try again in a moment.</Text>
        </View>
      </PageWrapper>
    );
  }

  if (loading && !detail && !item) {
    return (
      <PageWrapper title="Accessory" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="text-white/50 text-[12px] mt-3">Loading…</Text>
        </View>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper scroll title={title} subtitle={subtitle} headerLayout="inline">
      <View className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <View className="p-4 flex-row items-center">
          <RemoteIcon
            uri={item?.iconUrl ?? null}
            size={72}
            roundedClassName="rounded-2xl"
            placeholderClassName="bg-white/5 border border-white/10"
          />

          <View className="ml-4 flex-1">
            <Text className="text-white text-[18px] font-semibold" numberOfLines={2}>
              {title}
            </Text>

            <Text className="text-white/60 text-[12px] mt-1" numberOfLines={1}>
              Tech {tech ?? "—"}
            </Text>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {pill("Kind", kind)}
              {pill("Rarity", rarity)}
            </View>
          </View>
        </View>
      </View>

      <AboutSection description={description} effects={effects} stats={stats} />

      {!!treant && (
        <View className="mt-4">
          <Section title="Dependency Tree" rightText="Ingredient paths">
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="pr-6">{renderTreant(treant, 0)}</View>
              </ScrollView>

              <Text className="text-white/35 text-[11px] mt-2">(Shows ingredient dependency paths.)</Text>
            </View>
          </Section>
        </View>
      )}

      <ProducedAtSection rows={producedAt as any} />
      <RecipeSection title="Production" rows={production} />
      <RecipeSection title="Crafting Materials" rows={craftingMaterials} />
      <DroppedBySection rows={droppedBy} />
      <TreasureBoxSection rows={treasureBox} />
      <WanderingMerchantSection rows={wanderingMerchant} />
      <OthersSection rows={others} />
    </PageWrapper>
  );
}
