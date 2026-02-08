// components/LocalIcon.tsx
import React from "react";
import { View, type StyleProp, type ViewStyle, type ImageStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";

type LocalIconProps = {
  source: any | null | undefined; // require(...) | AppImages.*
  size?: number; // default 56
  className?: string; // outer wrapper (optional)
  roundedClassName?: string; // rounding classes (optional)
  placeholderClassName?: string; // placeholder bg/border (optional)
  contentFit?: "contain" | "cover";
  style?: StyleProp<ViewStyle | ImageStyle>;
  tintColor?: string;
  opacity?: number;
};

const LocalIcon: React.FC<LocalIconProps> = ({
  source,
  size = 56,
  className = "",
  roundedClassName = "rounded-xl",
  placeholderClassName = "bg-white/5 border border-white/10",
  contentFit = "contain",
  style,
  tintColor,
  opacity,
}) => {
  const baseStyle: any = { width: size, height: size };
  const mergedStyle = style ? [baseStyle, style] : baseStyle;

  if (!source) {
    return (
      <View className={[roundedClassName, placeholderClassName, className].join(" ")} style={mergedStyle} />
    );
  }

  return (
    <ExpoImage
      source={source}
      style={[
        mergedStyle,
        tintColor ? ({ tintColor } as any) : null,
        typeof opacity === "number" ? ({ opacity } as any) : null,
      ]}
      contentFit={contentFit}
      transition={120}
    />
  );
};

export default LocalIcon;
