import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  GardenJournalEntry,
  GardenPlanSummary,
  PlannerDocument,
  SeasonalTask,
  ValidationIssue,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { PlannerPage } from '@/features/planner/PlannerPage';
import * as repositoryFactory from '@/repositories/repositoryFactory';
import * as plannerSeasonPacket from '@/services/plannerSeasonPacket';
import { useGardenStore } from '@/stores/gardenStore';
import { useHistoryStore } from '@/stores/historyStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';
import { useViewportStore } from '@/stores/viewportStore';

vi.mock('@/features/planner/PlannerCanvas', () => ({
  PlannerCanvas: () => <div>Canvas</div>,
}));

vi.mock('@/features/planner/PlannerInspector', () => ({
  PlannerInspector: () => <div>Inspector</div>,
}));

vi.mock('@/features/planner/PlannerJournalPanel', () => ({
  PlannerJournalPanel: () => <div>Journal</div>,
}));

vi.mock('@/features/planner/PlannerSeasonPanel', () => ({
  PlannerSeasonPanel: () => <div>Season Panel</div>,
}));

vi.mock('@/features/planner/PlannerSeasonWorkbench', () => ({
  PlannerSeasonWorkbench: () => <div>Workbench</div>,
}));

vi.mock('@/features/planner/PlannerSidebar', () => ({
  PlannerSidebar: () => <div>Sidebar</div>,
}));

const exportPlannerSeasonPacketMock = vi.spyOn(
  plannerSeasonPacket,
  'exportPlannerSeasonPacket',
);
const getGardenRepositorySpy = vi.spyOn(repositoryFactory, 'getGardenRepository');

const comparisonDocument: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden 2026',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2026',
    seasonFamilyId: 'family-1',
    sourcePlanId: null,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [],
  placements: [],
};

const plannerDocument: PlannerDocument = {
  plan: {
    id: 'plan-2',
    name: 'Kitchen Garden 2027',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2027',
    seasonFamilyId: 'family-1',
    sourcePlanId: 'plan-1',
    createdAt: '2027-04-12T00:00:00.000Z',
    updatedAt: '2027-04-12T00:00:00.000Z',
  },
  zones: [
    {
      id: 'zone-1',
      gardenPlanId: 'plan-2',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'North Bed',
      notes: '',
      gridX: 1,
      gridY: 1,
      widthCells: 4,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2027-04-12T00:00:00.000Z',
      updatedAt: '2027-04-12T00:00:00.000Z',
    },
    {
      id: 'zone-2',
      gardenPlanId: 'plan-2',
      type: 'container',
      shape: 'rectangle',
      name: 'Patio Pot',
      notes: '',
      gridX: 8,
      gridY: 2,
      widthCells: 2,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'container',
      createdAt: '2027-04-12T00:00:00.000Z',
      updatedAt: '2027-04-12T00:00:00.000Z',
    },
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-2',
      plantDefinitionId: 'plant-kale',
      zoneId: 'zone-1',
      notes: '',
      gridX: 2,
      gridY: 2,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2027-04-12T00:00:00.000Z',
      updatedAt: '2027-04-12T00:00:00.000Z',
    },
    {
      id: 'placement-2',
      gardenPlanId: 'plan-2',
      plantDefinitionId: 'plant-kale',
      zoneId: 'zone-1',
      notes: '',
      gridX: 3,
      gridY: 2,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2027-04-12T00:00:00.000Z',
      updatedAt: '2027-04-12T00:00:00.000Z',
    },
  ],
};

const planSummaries: GardenPlanSummary[] = [
  {
    id: 'plan-1',
    name: 'Kitchen Garden 2026',
    locationLabel: 'Home',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2026',
    seasonFamilyId: 'family-1',
    sourcePlanId: null,
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  {
    id: 'plan-2',
    name: 'Kitchen Garden 2027',
    locationLabel: 'Home',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2027',
    seasonFamilyId: 'family-1',
    sourcePlanId: 'plan-1',
    updatedAt: '2027-04-12T00:00:00.000Z',
  },
];

const plantDefinitions: PlantDefinition[] = [
  {
    id: 'plant-kale',
    commonName: 'Kale',
    varietyName: 'Lacinato',
    category: 'leafy',
    lifecycle: 'annual',
    spacingMm: 457,
    spreadMm: 457,
    heightMm: 762,
    sunRequirement: 'fullSun',
    waterRequirement: 'moderate',
    daysToMaturity: 55,
    plantFamily: 'Brassicaceae',
    plantingWindowStartMonth: 3,
    plantingWindowEndMonth: 9,
    successionIntervalDays: 21,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
];

const validationIssues: ValidationIssue[] = [
  {
    code: 'zone-overlap',
    severity: 'warning',
    message: 'Example overlap warning.',
    entityIds: ['zone-1', 'zone-2'],
  },
  {
    code: 'plant-spacing',
    severity: 'warning',
    message: 'Example spacing warning.',
    entityIds: ['placement-1', 'placement-2'],
  },
];

const journalEntries: GardenJournalEntry[] = [
  {
    id: 'journal-1',
    gardenPlanId: 'plan-2',
    title: 'Observation',
    body: 'The north edge stayed cool.',
    observedOn: '2027-04-21',
    createdAt: '2027-04-21T00:00:00.000Z',
    updatedAt: '2027-04-21T00:00:00.000Z',
  },
];

const seasonalTasks: SeasonalTask[] = [
  {
    id: 'seasonal-task-1',
    gardenPlanId: 'plan-2',
    plantDefinitionId: null,
    placementId: null,
    sourceKey: null,
    kind: 'task',
    status: 'pending',
    dueMonth: 4,
    title: 'Review packet',
    note: 'Share the season summary with the rest of the household.',
    createdAt: '2027-04-12T00:00:00.000Z',
    updatedAt: '2027-04-12T00:00:00.000Z',
  },
];

const initialGardenState = useGardenStore.getState();
const initialHistoryState = useHistoryStore.getState();
const initialPlannerUiState = usePlannerUiStore.getState();
const initialViewportState = useViewportStore.getState();

describe('PlannerPage', () => {
  beforeEach(() => {
    exportPlannerSeasonPacketMock.mockReset();
    exportPlannerSeasonPacketMock.mockResolvedValue(undefined);
    getGardenRepositorySpy.mockReturnValue({
      getPlanDocument: vi.fn().mockResolvedValue(comparisonDocument),
      listJournalEntries: vi.fn().mockResolvedValue(journalEntries),
      listSeasonalTasks: vi.fn().mockResolvedValue(seasonalTasks),
    } as unknown as ReturnType<typeof repositoryFactory.getGardenRepository>);

    act(() => {
      useGardenStore.setState({
        ...initialGardenState,
        settings: {
          ...initialGardenState.settings,
          autosaveEnabled: false,
        },
        activeDocument: plannerDocument,
        activePlanId: plannerDocument.plan.id,
        dirty: false,
        validationIssues,
        planSummaries,
        plantDefinitions,
        journalEntries,
        seasonalTasks,
      });
      useHistoryStore.setState({
        ...initialHistoryState,
        past: [],
        future: [],
      });
      useViewportStore.setState({
        ...initialViewportState,
        scale: 1,
      });
      usePlannerUiStore.setState(initialPlannerUiState);
    });
  });

  afterEach(() => {
    act(() => {
      useGardenStore.setState(initialGardenState);
      useHistoryStore.setState(initialHistoryState);
      useViewportStore.setState(initialViewportState);
      usePlannerUiStore.setState(initialPlannerUiState);
    });
    vi.clearAllMocks();
  });

  it('exports a season packet with the previous family plan snapshot', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/plans/plan-2']}>
        <Routes>
          <Route path="/plans/:planId" element={<PlannerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Season packet/i }));

    expect(getGardenRepositorySpy).toHaveBeenCalled();
    expect(exportPlannerSeasonPacketMock).toHaveBeenCalledWith({
      plannerDocument,
      planSummaries,
      comparisonDocument,
      plantDefinitions,
      validationIssues,
      journalEntries,
      seasonalTasks,
    });
  });

  it('selects related zones from a validation warning', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/plans/plan-2']}>
        <Routes>
          <Route path="/plans/:planId" element={<PlannerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: /Select zones for zone overlap/i }),
    );

    expect(usePlannerUiStore.getState().selection).toMatchObject({
      type: 'zone',
      id: 'zone-2',
      ids: ['zone-1', 'zone-2'],
    });
  });

  it('selects related plants from a validation warning', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/plans/plan-2']}>
        <Routes>
          <Route path="/plans/:planId" element={<PlannerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: /Select plants for plant spacing/i }),
    );

    expect(usePlannerUiStore.getState().selection).toMatchObject({
      type: 'placement',
      id: 'placement-2',
      ids: ['placement-1', 'placement-2'],
    });
  });
});
