// components/ui/helpers/GlassBadge.tsx
import { View, Text } from 'react-native';
import LiquidGlass from '../LiquidGlass';

interface GlassBadgeProps {
  label: string;
  tintColor: string;
}

export default function GlassBadge({ label, tintColor }: GlassBadgeProps) {
  return (
    <LiquidGlass
      glassEffectStyle="clear"
      interactive={false}
      tinted
      tintColor={tintColor}
      showFallbackBackground
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.16)",
      }}
    >
      <View style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text className="text-[10px] font-semibold text-slate-100">
          {label}
        </Text>
      </View>
    </LiquidGlass>
  );
}
