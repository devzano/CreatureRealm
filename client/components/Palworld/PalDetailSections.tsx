// components/Palworld/PalDetailSections.tsx
import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";

export function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function nonZeroNum(v: any): number | null {
  const n = safeNum(v);
  if (n == null) return null;
  if (n === 0) return null;
  return n;
}

export function slugToKind(slug: string) {
  const s = (slug ?? "").trim();
  if (!s) return "Unknown";
  const last = s.split("/").filter(Boolean).slice(-1)[0] ?? s;
  const base = last.replace(/[#?].*$/, "");
  return base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export function prettyRarity(r?: string | null) {
  const s = (r ?? "").trim();
  return s || "Common";
}

export function rarityRing(rarityRaw?: string | null) {
  const r = (rarityRaw ?? "").toLowerCase();
  if (r.includes("legend")) return "border-amber-400/70";
  if (r.includes("epic")) return "border-fuchsia-400/70";
  if (r.includes("rare")) return "border-sky-400/70";
  if (r.includes("uncommon")) return "border-emerald-400/70";
  return "border-white/10";
}

export function statFillIconName(key: string): string {
  const k = (key ?? "").toLowerCase().trim();

  if (k.includes("gold") || k.includes("coin") || k.includes("price") || k.includes("sell") || k.includes("buy"))
    return "cash";

  if (k.includes("rarity")) return "star-circle";
  if (k === "type" || k.includes("category")) return "shape";
  if (k.includes("rank")) return "trophy";
  if (k.includes("code") || k.includes("id")) return "barcode";

  if (k.includes("weight")) return "scale-bathroom";
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

export function SheetSectionLabel({ children }: { children: React.ReactNode; }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

export function KeyValueRows({
  rows,
}: {
  rows: Array<{
    key?: string | null;
    valueText?: string | null;
    valueItem?: { name?: string | null; } | null;
    keyItem?: { iconUrl?: string | null; } | null;
    keyIconUrl?: string | null;
  }>;
}) {
  if (!rows?.length) return null;

  return (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {rows.map((r, idx) => {
        const iconUrl = r?.keyItem?.iconUrl ?? r?.keyIconUrl ?? null;
        const iconName = statFillIconName(String(r?.key ?? ""));

        return (
          <View
            key={`${r?.key ?? "k"}:${idx}`}
            className={[
              "flex-row items-center justify-between py-3 px-3",
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

export function ProducedAtSection({
  rows,
}: {
  rows: { slug: string; name: string; iconUrl: string | null; }[];
}) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Produced At</SheetSectionLabel>

      <View className="flex-row flex-wrap gap-2">
        {rows.map((p) => (
          <View key={p.slug} className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5">
            <RemoteIcon
              uri={p.iconUrl}
              size={22}
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
    </View>
  );
}

export function RecipeSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    product?: { slug?: string | null; name?: string | null; iconUrl?: string | null; qty?: number | null } | null;
    schematicText?: string | null;
    materials?: Array<{
      slug: string;
      name: string;
      iconUrl: string | null;
      qty?: number | null;
      qtyText?: string | null;
    }> | null;
  }>;
}) {
  if (!rows?.length) return null;

  const MAX_VISIBLE = 5;
  const isScrollable = rows.length > MAX_VISIBLE;
  const visible = isScrollable ? rows.slice(0, MAX_VISIBLE) : rows;
  const MAX_SCROLL_HEIGHT = 420;

  const content = (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {visible.map((row, idx) => (
        <View
          key={`${row.product?.slug ?? "row"}:${idx}`}
          className={["py-4 px-3", idx !== visible.length - 1 ? "border-b border-white/5" : ""].join(" ")}
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
  );

  return (
    <View className="mt-5">
      <SheetSectionLabel>{title}</SheetSectionLabel>

      {isScrollable ? (
        <ScrollView
          style={{ maxHeight: MAX_SCROLL_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function DroppedBySection({
  rows,
}: {
  rows: Array<{
    pal?: { slug?: string | null; name?: string | null; iconUrl?: string | null; } | null;
    qtyText?: string | null;
    probabilityText?: string | null;
  }>;
}) {
  if (!rows?.length) return null;

  const MAX_VISIBLE = 5;
  const isScrollable = rows.length > MAX_VISIBLE;
  const visible = isScrollable ? rows.slice(0, MAX_VISIBLE) : rows;
  const MAX_SCROLL_HEIGHT = 420;

  const content = (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {visible.map((r, idx) => (
        <View
          key={`${r.pal?.slug ?? "pal"}:${idx}`}
          className={[
            "flex-row items-center justify-between py-3 px-3",
            idx !== visible.length - 1 ? "border-b border-white/5" : "",
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
  );

  return (
    <View className="mt-5">
      <SheetSectionLabel>Dropped By</SheetSectionLabel>

      {isScrollable ? (
        <ScrollView
          style={{ maxHeight: MAX_SCROLL_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function TreasureBoxSection({
  rows,
}: {
  rows: Array<{
    item?: { slug?: string | null; name?: string | null; iconUrl?: string | null; } | null;
    qtyText?: string | null;
    sourceText?: string | null;
  }>;
}) {
  if (!rows?.length) return null;

  const MAX_VISIBLE = 5;
  const isScrollable = rows.length > MAX_VISIBLE;
  const visible = isScrollable ? rows.slice(0, MAX_VISIBLE) : rows;
  const MAX_SCROLL_HEIGHT = 420;

  const content = (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {visible.map((r, idx) => (
        <View
          key={`${r.item?.slug ?? "tb"}:${idx}`}
          className={["py-4 px-3", idx !== visible.length - 1 ? "border-b border-white/5" : ""].join(" ")}
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
  );

  return (
    <View className="mt-5">
      <SheetSectionLabel>Treasure Box</SheetSectionLabel>

      {isScrollable ? (
        <ScrollView
          style={{ maxHeight: MAX_SCROLL_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function WanderingMerchantSection({
  rows,
}: {
  rows: Array<{
    item?: { slug?: string | null; name?: string | null; iconUrl?: string | null; } | null;
    sourceText?: string | null;
  }>;
}) {
  if (!rows?.length) return null;

  const MAX_VISIBLE = 5;
  const isScrollable = rows.length > MAX_VISIBLE;
  const visible = isScrollable ? rows.slice(0, MAX_VISIBLE) : rows;
  const MAX_SCROLL_HEIGHT = 420;

  const content = (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {visible.map((r, idx) => (
        <View
          key={`${r.item?.slug ?? "wm"}:${idx}`}
          className={["py-4 px-3", idx !== visible.length - 1 ? "border-b border-white/5" : ""].join(" ")}
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
  );

  return (
    <View className="mt-5">
      <SheetSectionLabel>Wandering Merchant</SheetSectionLabel>

      {isScrollable ? (
        <ScrollView
          style={{ maxHeight: MAX_SCROLL_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function EffectsSection({ effects }: { effects: any[]; }) {
  const list = Array.isArray(effects) ? effects : [];
  const clean = list
    .map((e) => String(e ?? "").trim())
    .filter(Boolean);

  if (!clean.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Effects</SheetSectionLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {clean.map((s, idx) => (
          <View
            key={`${s}:${idx}`}
            className={["px-3 py-2", idx !== clean.length - 1 ? "border-b border-white/5" : ""].join(" ")}
          >
            <Text className="text-white/85 text-[13px] leading-5">{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export type QuickRecipeRowLike = {
  slug?: string | null;
  name?: string | null;
  iconUrl?: string | null;
  qty?: number | null;
};

export function QuickRecipeSection({ rows }: { rows: QuickRecipeRowLike[]; }) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Quick Recipe</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {list.map((r, idx) => (
          <View
            key={`${String(r?.slug ?? "r")}:${idx}`}
            className={[
              "flex-row items-center justify-between py-2 px-3",
              idx !== list.length - 1 ? "border-b border-white/5" : "",
            ].join(" ")}
          >
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={r?.iconUrl ?? null}
                size={28}
                roundedClassName="rounded-lg"
                placeholderClassName="bg-white/5 border border-white/10"
              />
              <Text className="ml-3 text-white/90 text-[13px]" numberOfLines={1}>
                {r?.name ?? "—"}
              </Text>
            </View>

            <Text className="text-white/70 text-[13px] ml-3">
              {r?.qty != null ? `x${r.qty}` : "—"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export type TreantNodeLike = {
  slug?: string | null;
  name?: string | null;
  iconUrl?: string | null;
  qty?: number | null;
  children?: TreantNodeLike[] | null;
};

export function renderTreantTree(node: TreantNodeLike, depth: number) {
  const qtyLabel = node?.qty != null ? String(node.qty) : "—";
  const label = String(node?.name ?? node?.slug ?? "").trim();

  const NODE = 50;
  const V_GAP = 14;
  const H_GAP = 30;
  const LINE = "#0cd3f1";
  const LINE_W = 2;

  const hasKids = Array.isArray(node?.children) && node.children.length > 0;

  return (
    <View key={`${node.slug ?? "node"}:${depth}:${node.iconUrl ?? ""}`} className="items-center">
      <View
        className="relative rounded-lg border border-white/35 bg-black/20 overflow-hidden items-center justify-center"
        style={{ width: NODE, height: NODE }}
      >
        <View className="absolute top-0.5 left-1">
          <Text className="text-white text-[14px] font-extrabold">{qtyLabel}</Text>
        </View>

        <RemoteIcon
          uri={node.iconUrl ?? null}
          size={NODE - 8}
          roundedClassName="rounded-md"
          placeholderClassName="bg-white/5 border border-white/10"
          contentFit="contain"
        />
      </View>

      {!!label ? (
        <Text className="text-white/50 text-[10px] mt-0.5" numberOfLines={1}>
          {label}
        </Text>
      ) : null}

      {hasKids ? (
        <View className="items-center" style={{ marginTop: 4 }}>
          <View style={{ width: LINE_W, height: V_GAP, backgroundColor: LINE, borderRadius: 999 }} />

          <View className="relative items-center">
            <View
              style={{
                position: "absolute",
                top: 0,
                left: H_GAP / 2,
                right: H_GAP / 2,
                height: LINE_W,
                backgroundColor: LINE,
                borderRadius: 999,
              }}
            />

            <View className="flex-row items-start justify-center" style={{ paddingHorizontal: H_GAP / 2 }}>
              {node.children!.map((c, idx) => (
                <View
                  key={`${c.slug ?? "c"}:${idx}`}
                  className="items-center"
                  style={{ marginHorizontal: H_GAP / 2 }}
                >
                  <View style={{ width: LINE_W, height: V_GAP, backgroundColor: LINE, borderRadius: 999 }} />
                  {renderTreantTree(c, depth + 1)}
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function renderTreantList(node: TreantNodeLike, depth: number) {
  const pad = Math.min(36, depth * 16);
  const qtyLabel = node?.qty != null ? `x${node.qty}` : "—";
  const label = String(node?.name ?? node?.slug ?? "").trim();

  const ICON = 22;
  const QTY_SIZE = 13;
  const LABEL_SIZE = 12;
  const ROW_Y = 2;

  return (
    <View key={`${node.slug ?? "node"}:${depth}:${node.iconUrl ?? ""}`} style={{ marginLeft: pad }}>
      <View className="flex-row items-center" style={{ paddingVertical: ROW_Y }}>
        <RemoteIcon
          uri={node.iconUrl ?? null}
          size={ICON}
          roundedClassName="rounded-md"
          placeholderClassName="bg-white/5 border border-white/10"
          contentFit="contain"
        />

        <Text className="ml-2 text-white/85" style={{ fontSize: QTY_SIZE, lineHeight: QTY_SIZE + 2 }}>
          {qtyLabel}
        </Text>

        {!!label ? (
          <Text
            className="text-white/40 ml-2 flex-1"
            style={{ fontSize: LABEL_SIZE, lineHeight: LABEL_SIZE + 2 }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </View>

      {!!node.children?.length && node.children.map((c) => renderTreantList(c, depth + 1))}
    </View>
  );
}

export function TreantViewToggle({
  value,
  onChange,
  compact = false,
}: {
  value: "tree" | "list";
  onChange: (v: "tree" | "list") => void;
  compact?: boolean;
}) {
  return (
    <View
      className={[
        "flex-row rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden items-center",
        compact ? "mb-2" : "self-center mb-2",
      ].join(" ")}
    >
      <Pressable
        onPress={() => onChange("tree")}
        className={["px-3 py-0.5", value === "tree" ? "bg-white/10" : "bg-transparent"].join(" ")}
      >
        <Text
          className={["text-[10px] font-bold uppercase tracking-tight", value === "tree" ? "text-white" : "text-white/40"].join(" ")}
        >
          Tree
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange("list")}
        className={[
          "px-3 py-0.5 border-l border-white/10",
          value === "list" ? "bg-white/10" : "bg-transparent",
        ].join(" ")}
      >
        <Text
          className={["text-[10px] font-bold uppercase tracking-tight", value === "list" ? "text-white" : "text-white/40"].join(" ")}
        >
          List
        </Text>
      </Pressable>
    </View>
  );
}

export function TreantSection({
  treant,
  view,
  onViewChange,
}: {
  treant: TreantNodeLike;
  view: "tree" | "list";
  onViewChange: (v: "tree" | "list") => void;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <SheetSectionLabel>Dependency Tree</SheetSectionLabel>
        <TreantViewToggle value={view} onChange={onViewChange} compact />
      </View>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <ScrollView
          horizontal={view === "tree"}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            view === "tree"
              ? {
                flexGrow: 1,
                minWidth: "100%",
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 24,
                paddingVertical: 8,
              }
              : { paddingBottom: 8 }
          }
        >
          {view === "tree" ? (
            <View style={{ alignItems: "center" }}>{renderTreantTree(treant, 0)}</View>
          ) : (
            <View style={{ paddingVertical: 6 }}>{renderTreantList(treant, 0)}</View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
