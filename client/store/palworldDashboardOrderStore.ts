// store/palworldDashboardOrderStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type OrderKey = "palworld.items" | "palworld.upgrades" | "palworld.construction";

type State = {
  orders: Partial<Record<OrderKey, string[]>>;
  setOrder: (key: OrderKey, order: string[]) => void;
  resetOrder: (key: OrderKey) => void;
};

export const usePalworldDashboardOrderStore = create<State>()(
  persist(
    (set) => ({
      orders: {},
      setOrder: (key, order) =>
        set((s) => ({
          orders: {
            ...s.orders,
            [key]: Array.from(new Set(order)), // de-dupe just in case
          },
        })),
      resetOrder: (key) =>
        set((s) => {
          const next = { ...s.orders };
          delete next[key];
          return { orders: next };
        }),
    }),
    {
      name: "palworld.dashboardOrders.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
