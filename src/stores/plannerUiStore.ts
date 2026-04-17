import { create } from 'zustand';

import type { LayoutPattern, ZoneType } from '@/domain/garden/models';

export type PlannerTool = 'select' | 'pan' | ZoneType;
export type PlacementPattern = LayoutPattern;

export interface PlannerSelection {
  type: 'plan' | 'zone' | 'placement';
  id: string | null;
  ids: string[];
}

const clampPlacementCount = (count: number) =>
  Math.max(1, Math.min(12, Math.round(count)));

const emptySelection = (): PlannerSelection => ({
  type: 'plan',
  id: null,
  ids: [],
});

const createEntitySelection = (
  type: 'zone' | 'placement',
  id: string,
): PlannerSelection => ({
  type,
  id,
  ids: [id],
});

const toggleEntitySelection = (
  selection: PlannerSelection,
  type: 'zone' | 'placement',
  id: string,
  additive: boolean,
): PlannerSelection => {
  if (!additive || selection.type !== type) {
    return createEntitySelection(type, id);
  }

  if (!selection.ids.includes(id)) {
    return {
      type,
      id,
      ids: [...selection.ids, id],
    };
  }

  const ids = selection.ids.filter((entry) => entry !== id);

  if (ids.length === 0) {
    return emptySelection();
  }

  return {
    type,
    id: ids.at(-1) ?? null,
    ids,
  };
};

interface PlannerUiState {
  activeTool: PlannerTool;
  activePanel: 'tools' | 'plants' | 'layers';
  selection: PlannerSelection;
  armedPlantId: string | null;
  placementPattern: PlacementPattern;
  placementCount: number;
  visibleLayers: {
    zones: boolean;
    plants: boolean;
    labels: boolean;
    measurements: boolean;
    notes: boolean;
    sunShade: boolean;
    irrigation: boolean;
  };
  setActiveTool: (tool: PlannerTool) => void;
  setActivePanel: (panel: PlannerUiState['activePanel']) => void;
  setPlacementPattern: (pattern: PlacementPattern) => void;
  setPlacementCount: (count: number) => void;
  selectPlan: () => void;
  selectZone: (zoneId: string, additive?: boolean) => void;
  selectPlacement: (placementId: string, additive?: boolean) => void;
  armPlant: (plantId: string | null) => void;
  toggleLayer: (layer: keyof PlannerUiState['visibleLayers']) => void;
  clearSelection: () => void;
}

export const usePlannerUiStore = create<PlannerUiState>((set) => ({
  activeTool: 'select',
  activePanel: 'tools',
  selection: emptySelection(),
  armedPlantId: null,
  placementPattern: 'single',
  placementCount: 4,
  visibleLayers: {
    zones: true,
    plants: true,
    labels: true,
    measurements: true,
    notes: false,
    sunShade: false,
    irrigation: false,
  },
  setActiveTool: (tool) =>
    set((state) => ({
      ...state,
      activeTool: tool,
      armedPlantId: tool === 'select' || tool === 'pan' ? state.armedPlantId : null,
      })),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setPlacementPattern: (placementPattern) => set({ placementPattern }),
  setPlacementCount: (placementCount) =>
    set({ placementCount: clampPlacementCount(placementCount) }),
  selectPlan: () => set({ selection: emptySelection() }),
  selectZone: (zoneId, additive = false) =>
    set((state) => ({
      selection: toggleEntitySelection(state.selection, 'zone', zoneId, additive),
    })),
  selectPlacement: (placementId, additive = false) =>
    set((state) => ({
      selection: toggleEntitySelection(
        state.selection,
        'placement',
        placementId,
        additive,
      ),
    })),
  armPlant: (plantId) =>
    set({
      armedPlantId: plantId,
      activePanel: 'plants',
      activeTool: 'select',
    }),
  toggleLayer: (layer) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    })),
  clearSelection: () => set({ selection: emptySelection() }),
}));
