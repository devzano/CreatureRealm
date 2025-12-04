// components/layout/PageWrapper.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  type ViewProps,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

type PageWrapperProps = {
  children: React.ReactNode;

  /** Main header title */
  title?: string;
  /** Optional line under the title */
  subtitle?: string;

  /** If true, content is wrapped in ScrollView; otherwise a plain View */
  scroll?: boolean;

  /** Hide the default back button on the top-left */
  hideBackButton?: boolean;

  /**
   * Hide header chrome (title, subtitle, header background).
   * You still get the top nav row for buttons.
   */
  hideHeaderChrome?: boolean;

  /** Optional extra nodes on the left side of the header (next to back) */
  leftActions?: React.ReactNode;

  /** Optional nodes on the right side of the header (icons, buttons, etc.) */
  rightActions?: React.ReactNode;

  /** Custom back behavior; defaults to router.back() */
  onBackPress?: () => void;

  /** Optional override for page background, defaults to slate-950 */
  backgroundColor?: string;
} & Omit<ViewProps, "children">;

const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  title,
  subtitle,
  scroll = false,
  hideBackButton = false,
  hideHeaderChrome = false,
  leftActions,
  rightActions,
  onBackPress,
  backgroundColor = "#020617", // slate-950
  style,
  ...rest
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const Header = (
    <View
      className="px-4 pb-3"
      style={{
        paddingTop: insets.top + 4,
        backgroundColor: hideHeaderChrome ? "transparent" : backgroundColor,
      }}
    >
      {/* Top nav row */}
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center">
          {!hideBackButton && (
            <TouchableOpacity
              onPress={handleBack}
              className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 items-center justify-center mr-2"
              hitSlop={8}
            >
              <Feather name="chevron-left" size={18} color="#e5e7eb" />
            </TouchableOpacity>
          )}

          {/* Left actions (e.g. small label button) */}
          {leftActions}
        </View>

        {/* Right-side nav buttons */}
        <View className="flex-row items-center">{rightActions}</View>
      </View>

      {/* Header text (can be entirely removed with hideHeaderChrome) */}
      {!hideHeaderChrome && (
        <>
          {title ? (
            <Text className="text-xl font-extrabold text-slate-50">
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text className="text-[12px] text-slate-400 mt-0.5">
              {subtitle}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  if (scroll) {
    return (
      <View
        className="flex-1"
        style={[{ backgroundColor }, style]}
        {...rest}
      >
        {Header}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={[{ backgroundColor }, style]}
      {...rest}
    >
      {Header}
      <View className="flex-1 px-4 pb-4">{children}</View>
    </View>
  );
};

export default PageWrapper;