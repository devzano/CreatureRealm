// components/Palworld/palSheetSections.tsx
import React from "react";
import { View, Text, ScrollView } from "react-native";
import RemoteIcon from "@/components/Palworld/RemoteIcon";
import type { TreantNode } from "@/lib/palworld/paldbDetailKit";
import { safeText } from "@/components/Palworld/Construction/palGridKit";

export function SheetLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

export function DescriptionSection({ text }: { text: string | null | undefined }) {
  const s = String(text ?? "").trim();
  if (!s) return null;

  return (
    <View className="mt-5">
      <SheetLabel>About</SheetLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <Text className="text-white/80 text-[12px] leading-5">{s}</Text>
      </View>
    </View>
  );
}

export function RecipeSection({
  rows,
}: {
  rows: Array<{ slug?: string; name?: string; iconUrl?: string | null; qty?: any }>;
}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  return (
    <View className="mt-5">
      <SheetLabel>Recipe</SheetLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {list.map((r, idx) => {
          const key = String(r?.slug ?? `${r?.name ?? "r"}:${idx}`);
          const nm = safeText(r?.name) || "—";
          const qty = r?.qty;

          return (
            <View
              key={key}
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
                  {nm}
                </Text>
              </View>

              <Text className="text-white/70 text-[13px] ml-3">{qty != null ? `x${qty}` : "—"}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function renderTreant(node: TreantNode, depth: number) {
  const pad = Math.min(22, depth * 12);
  const qtyLabel = node?.qty != null ? `x${node.qty}` : "—";
  const label = (node?.name ?? node?.slug ?? "").toString();

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

        {!!label && (
          <Text className="text-white/35 text-[11px] ml-2" numberOfLines={1}>
            {label}
          </Text>
        )}
      </View>

      {!!node.children?.length && node.children.map((c) => renderTreant(c, depth + 1))}
    </View>
  );
}

export function DependencyTreeSection({ treant }: { treant: TreantNode | null | undefined }) {
  if (!treant) return null;

  return (
    <View className="mt-5">
      <SheetLabel>Dependency Tree</SheetLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="pr-6">{renderTreant(treant, 0)}</View>
        </ScrollView>
      </View>
    </View>
  );
}

export function WorkSuitabilitySection({
  ws,
}: {
  ws:
    | null
    | undefined
    | {
        name?: string | null;
        level?: any;
      };
}) {
  const name = safeText(ws?.name);
  const lvl = ws?.level;

  if (!name && (lvl == null || String(lvl).trim() === "")) return null;

  return (
    <View className="mt-5">
      <SheetLabel>Work Suitability</SheetLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <View className="flex-row items-center justify-between py-3 px-3">
          <Text className="text-white/85 text-[12px] font-semibold" numberOfLines={1}>
            {name || "—"}
          </Text>
          <Text className="text-white/70 text-[12px]" numberOfLines={1}>
            {lvl != null && String(lvl).trim() !== "" ? `Lv ${String(lvl)}` : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}