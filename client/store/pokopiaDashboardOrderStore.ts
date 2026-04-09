import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type OrderKey = "pokopia.dashboard";

type State = {
  orders: Partial<Record<OrderKey, string[]>>;
  setOrder: (key: OrderKey, order: string[]) => void;
  resetOrder: (key: OrderKey) => void;
};

export const usePokopiaDashboardOrderStore = create<State>()(
  persist(
    (set) => ({
      orders: {},
      setOrder: (key, order) =>
        set((state) => ({
          orders: {
            ...state.orders,
            [key]: Array.from(new Set(order)),
          },
        })),
      resetOrder: (key) =>
        set((state) => {
          const next = { ...state.orders };
          delete next[key];
          return { orders: next };
        }),
    }),
    {
      name: "pokopia.dashboardOrders.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
