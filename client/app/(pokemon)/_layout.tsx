import { Stack } from "expo-router";

export default function PokemonLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="game/[id]" />
      <Stack.Screen name="pokemon/[id]" />
    </Stack>
  );
}
