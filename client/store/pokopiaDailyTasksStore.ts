import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type PokopiaDailyTasksState = {
  dateKey: string;
  checkedTaskIds: string[];
  ensureDate: (dateKey: string) => void;
  toggleTask: (taskId: string, dateKey: string) => void;
  resetForDate: (dateKey: string) => void;
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export const usePokopiaDailyTasksStore = create<PokopiaDailyTasksState>()(
  persist(
    (set) => ({
      dateKey: "",
      checkedTaskIds: [],

      ensureDate: (dateKey) =>
        set((state) =>
          state.dateKey === dateKey
            ? state
            : {
                dateKey,
                checkedTaskIds: [],
              }
        ),

      toggleTask: (taskId, dateKey) =>
        set((state) => {
          const nextChecked =
            state.dateKey !== dateKey
              ? []
              : state.checkedTaskIds.includes(taskId)
                ? state.checkedTaskIds.filter((id) => id !== taskId)
                : unique([...state.checkedTaskIds, taskId]);

          return {
            dateKey,
            checkedTaskIds: state.dateKey !== dateKey ? [taskId] : nextChecked,
          };
        }),

      resetForDate: (dateKey) =>
        set({
          dateKey,
          checkedTaskIds: [],
        }),
    }),
    {
      name: "pokopia.dailyTasks.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
