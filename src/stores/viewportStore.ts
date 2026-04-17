import { create } from 'zustand';

export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface ViewportStore extends ViewportState {
  setScale: (scale: number) => void;
  zoomBy: (delta: number) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  reset: () => void;
}

const clampScale = (value: number) => Math.min(2.5, Math.max(0.45, value));

export const useViewportStore = create<ViewportStore>((set) => ({
  scale: 1,
  offsetX: 28,
  offsetY: 28,
  setScale: (scale) => set({ scale: clampScale(scale) }),
  zoomBy: (delta) => set((state) => ({ scale: clampScale(state.scale + delta) })),
  panBy: (deltaX, deltaY) =>
    set((state) => ({
      offsetX: state.offsetX + deltaX,
      offsetY: state.offsetY + deltaY,
    })),
  reset: () =>
    set({
      scale: 1,
      offsetX: 28,
      offsetY: 28,
    }),
}));
