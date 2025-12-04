// store/uiOverlayStore.ts
import { create } from 'zustand';

type UiOverlayState = {
  isFullscreenOverlayVisible: boolean;
  setFullscreenOverlayVisible: (visible: boolean) => void;
};

export const useUiOverlayStore = create<UiOverlayState>((set) => ({
  isFullscreenOverlayVisible: false,
  setFullscreenOverlayVisible: (visible) => set({ isFullscreenOverlayVisible: visible }),
}));
