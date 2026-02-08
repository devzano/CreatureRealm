// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import FloatingTabBar from "@/components/Tabbar/FloatingTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      // tabBar={(props) => <FloatingTabBar {...props} />} //
      screenOptions={{
        tabBarActiveTintColor: "#0cd3f1",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="sports-esports" color={color} size={size} />
          ),
        }}
      />

      {/* <Tabs.Screen
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group"
              color={color}
              size={size}
            />
          ),
        }}
      /> */}
    </Tabs>
  );
}
