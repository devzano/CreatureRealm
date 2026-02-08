import { Stack } from "expo-router";

export default function PalworldLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="pal/[id]" />
    </Stack>
  );
}
