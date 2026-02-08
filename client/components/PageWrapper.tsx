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
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  hideBackButton?: boolean;
  hideHeaderChrome?: boolean;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  onBackPress?: () => void;
  backgroundColor?: string;
  headerLayout?: 'inline' | 'stacked';
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
  backgroundColor = "#020617",
  headerLayout = 'stacked',
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
      {headerLayout === 'inline' ? (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-4">
            {!hideBackButton && (
              <TouchableOpacity
                onPress={handleBack}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 items-center justify-center mr-2"
                hitSlop={8}
              >
                <Feather name="chevron-left" size={18} color="#e5e7eb" />
              </TouchableOpacity>
            )}

            {/* Left actions */}
            {leftActions}

            {/* Header text inline */}
            {!hideHeaderChrome && (
              <View className="ml-2 flex-shrink">
                {title && (
                  <Text className="text-lg font-extrabold text-slate-50" numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {subtitle && (
                  <Text className="text-[10px] text-slate-400" numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* RIGHT-SIDE CONTENT */}
          <View className="flex-row items-center">
            {rightActions}
          </View>
        </View>
      ) : (
        <>
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

              {/* Left actions */}
              {leftActions}
            </View>

            {/* Right-side nav buttons */}
            <View className="flex-row items-center">{rightActions}</View>
          </View>

          {/* Header text below nav row */}
          {!hideHeaderChrome && (
            <>
              {title && (
                <Text className="text-xl font-extrabold text-slate-50">
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text className="text-[12px] text-slate-400 mt-0.5">
                  {subtitle}
                </Text>
              )}
            </>
          )}
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
      <View className="flex-1 px-2 pb-4">{children}</View>
    </View>
  );
};

export default PageWrapper;