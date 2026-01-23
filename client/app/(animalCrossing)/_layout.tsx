import { Stack } from "expo-router";

export default function AnimalCrossingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="furniture/[id]" />
      <Stack.Screen name="fish/[id]" />
      <Stack.Screen name="seaCreature/[id]" />
      <Stack.Screen name="bug/[id]" />
      <Stack.Screen name="clothing/[id]" />
      <Stack.Screen name="fossil/[id]" />
      <Stack.Screen name="fossil-group/[id]" />
      <Stack.Screen name="photo/[id]" />
      <Stack.Screen name="gyroid/[id]" />
      <Stack.Screen name="art/[id]" />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="recipe/[id]" />
      <Stack.Screen name="tool/[id]" />
    </Stack>
  );
}
