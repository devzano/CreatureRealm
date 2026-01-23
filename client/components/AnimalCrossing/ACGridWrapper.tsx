// components/AnimalCrossing/ACGridWrapper.tsx
import React from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";

type FooterMode = "more" | "end";

type ACGridWrapperProps<T> = {
  isInitialLoading: boolean;
  initialLoadingText: string;
  errorText: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyText: string;
  headerLine?: string;
  topBar?: React.ReactNode;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement | null;
  footerMode: FooterMode;
  footerLoadingText?: string;
  footerEndText?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  numColumns?: number;
  contentContainerStyle?: any;
  columnWrapperStyle?: any;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  onEndReachedThreshold?: number;
  onEndReached?: () => void;
  viewabilityConfig?: any;
  onViewableItemsChanged?: ((info: any) => void) | undefined;
  removeClippedSubviews?: boolean;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  updateCellsBatchingPeriod?: number;
  listHeaderComponent?: React.ReactElement | null;
  listFooterComponent?: React.ReactElement | null;
};

export default function ACGridWrapper<T>(props: ACGridWrapperProps<T>) {
  const {
    isInitialLoading,
    initialLoadingText,

    errorText,
    onRetry,

    isEmpty,
    emptyText,

    headerLine,
    topBar,

    data,
    keyExtractor,
    renderItem,

    footerMode,
    footerLoadingText = "Loading more…",
    footerEndText = "End of list",

    refreshing = false,
    onRefresh,

    numColumns = 3,
    contentContainerStyle = { paddingHorizontal: 4, paddingBottom: 24 },
    columnWrapperStyle,
    keyboardShouldPersistTaps = "handled",
    onEndReachedThreshold = 0.65,
    onEndReached,

    viewabilityConfig,
    onViewableItemsChanged,

    removeClippedSubviews = true,
    initialNumToRender = 18,
    maxToRenderPerBatch = 18,
    windowSize = 9,
    updateCellsBatchingPeriod = 40,

    listHeaderComponent,
    listFooterComponent,
  } = props;

  if (isInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center mt-4">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-slate-300">{initialLoadingText}</Text>
      </View>
    );
  }

  if (errorText) {
    return (
      <View className="flex-1 items-center justify-center mt-4 px-4">
        <Text className="text-sm text-rose-300 text-center">{errorText}</Text>

        <View className="mt-3 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700">
          <Text onPress={onRetry} className="text-[12px] text-slate-100 font-semibold">
            Retry
          </Text>
        </View>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center mt-4 px-4">
        <Text className="text-sm text-slate-400 text-center">{emptyText}</Text>
      </View>
    );
  }

  const header = (
    <>
      {topBar ? <View className="mt-2">{topBar}</View> : null}
      {!!headerLine ? (
        <Text className="mt-2 text-[11px] text-slate-500 px-1">{headerLine}</Text>
      ) : null}
    </>
  );

  const defaultFooter =
    footerMode === "more" ? (
      <View className="py-4 items-center">
        <ActivityIndicator />
        <Text className="mt-2 text-[11px] text-slate-500">{footerLoadingText}</Text>
      </View>
    ) : (
      <View className="py-4 items-center">
        <Text className="text-[11px] text-slate-600">{footerEndText}</Text>
      </View>
    );

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem as any}
      numColumns={numColumns}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentContainerStyle={contentContainerStyle}
      columnWrapperStyle={numColumns > 1 ? columnWrapperStyle : undefined}
      onEndReachedThreshold={onEndReachedThreshold}
      onEndReached={onEndReached}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged as any}
      removeClippedSubviews={removeClippedSubviews}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
      }
      ListHeaderComponent={
        listHeaderComponent ? (
          <>
            {header}
            {listHeaderComponent}
          </>
        ) : (
          header
        )
      }
      ListFooterComponent={listFooterComponent ?? defaultFooter}
    />
  );
}
