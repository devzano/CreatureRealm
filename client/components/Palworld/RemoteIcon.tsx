// components/RemoteIcon.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, type StyleProp, type ViewStyle, type ImageStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

type RemoteIconProps = {
  uri: string | null | undefined;
  size?: number; // default 56
  className?: string; // outer wrapper (optional)
  roundedClassName?: string; // rounding classes (optional)
  placeholderClassName?: string; // placeholder bg/border (optional)
  contentFit?: "contain" | "cover";
  style?: StyleProp<ViewStyle | ImageStyle>;
};

function normalizeRemoteUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const s = String(uri).trim();
  if (!s) return null;
  try {
    return encodeURI(s);
  } catch {
    return s;
  }
}

function buildFallbackUris(primary: string): string[] {
  const out: string[] = [];
  const u = primary;

  out.push(u);

  if (u.endsWith(".webp")) out.push(u.replace(/\.webp$/i, ".png"));
  if (u.endsWith(".webp")) out.push(u.replace(/\.webp$/i, ".jpg"));
  if (u.endsWith(".png")) out.push(u.replace(/\.png$/i, ".webp"));
  if (u.endsWith(".png")) out.push(u.replace(/\.png$/i, ".jpg"));

  if (u.includes("://cdn.paldb.cc/")) out.push(u.replace("://cdn.paldb.cc/", "://paldb.cc/"));

  return Array.from(new Set(out));
}

export function prefetchRemoteIcons(uris: Array<string | null | undefined>) {
  const normalized = uris.map(normalizeRemoteUri).filter((u): u is string => !!u);
  if (!normalized.length) return;

  ExpoImage.prefetch(normalized);
}

const RemoteIcon: React.FC<RemoteIconProps> = ({
  uri,
  size = 56,
  className = "",
  roundedClassName = "rounded-xl",
  placeholderClassName = "bg-white/5 border border-white/10",
  contentFit = "contain",
  style,
}) => {
  const normalized = useMemo(() => normalizeRemoteUri(uri), [uri]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const candidates = useMemo(() => {
    if (!normalized) return [];
    return buildFallbackUris(normalized);
  }, [normalized]);

  const activeUri = candidates[candidateIdx] ?? null;

  useEffect(() => {
    setCandidateIdx(0);
    setFailed(false);
  }, [normalized]);

  const handleError = useCallback(() => {
    if (candidateIdx + 1 < candidates.length) {
      setCandidateIdx((x) => x + 1);
      return;
    }
    setFailed(true);
  }, [candidateIdx, candidates.length]);

  const baseStyle: any = { width: size, height: size };
  const mergedStyle = style ? [baseStyle, style] : baseStyle;

  if (!activeUri || failed) {
    return (
      <View
        className={[roundedClassName, placeholderClassName, className].join(" ")}
        style={mergedStyle}
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri: activeUri }}
      style={mergedStyle}
      contentFit={contentFit}
      transition={120}
      cachePolicy="disk"
      recyclingKey={activeUri}
      onError={handleError}
    />
  );
};

export default RemoteIcon;