import { Stack } from "expo-router";

export default function PalworldLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="pal/[id]" />
      <Stack.Screen name="sphere/[id]" />
      <Stack.Screen name="schematic/[id]" />
      <Stack.Screen name="material/[id]" />
      <Stack.Screen name="weapon/[id]" />
      <Stack.Screen name="consumable/[id]" />
      <Stack.Screen name="ingredient/[id]" />
      <Stack.Screen name="ammo/[id]" />
      <Stack.Screen name="accessory/[id]" />
      <Stack.Screen name="armor/[id]" />
      <Stack.Screen name="keyItem/[id]" />
      <Stack.Screen name="glider/[id]" />
      <Stack.Screen name="sphereModule/[id]" />
    </Stack>
  );
}
