import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { PlannerSeasonPanel } from '@/features/planner/PlannerSeasonPanel';
import * as repositoryFactory from '@/repositories/repositoryFactory';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const getPlanDocumentMock = vi.fn();
const getGardenRepositorySpy = vi.spyOn(repositoryFactory, 'getGardenRepository');
const plannerUiInitialState = usePlannerUiStore.getState();

const withCompatibility = (
  plant: PlantDefinition,
  compatibility: {
    companionPlantNames?: string[];
    conflictPlantNames?: string[];
    preferredZoneTypes?: string[];
  } = {},
) =>
  ({
    ...plant,
    companionPlantNames: [],
    conflictPlantNames: [],
    preferredZoneTypes: [],
    ...compatibility,
  }) as PlantDefinition;

const plantDefinitions: PlantDefinition[] = [
  withCompatibility({
    id: 'plant-basil',
    commonName: 'Basil',
    varietyName: 'Genovese',
    category: 'herb',
    lifecycle: 'annual',
    spacingMm: 305,
    spreadMm: 305,
    heightMm: 457,
    sunRequirement: 'fullSun',
    waterRequirement: 'moderate',
    daysToMaturity: 50,
    plantFamily: 'Lamiaceae',
    plantingWindowStartMonth: 5,
    plantingWindowEndMonth: 8,
    successionIntervalDays: 21,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  }, {
    companionPlantNames: ['Tomato'],
    preferredZoneTypes: ['raisedBed', 'container'],
  }),
  withCompatibility({
    id: 'plant-tomato',
    commonName: 'Tomato',
    varietyName: 'Sun Gold',
    category: 'fruiting',
    lifecycle: 'annual',
    spacingMm: 610,
    spreadMm: 610,
    heightMm: 1524,
    sunRequirement: 'fullSun',
    waterRequirement: 'moderate',
    daysToMaturity: 65,
    plantFamily: 'Solanaceae',
    plantingWindowStartMonth: 4,
    plantingWindowEndMonth: 6,
    successionIntervalDays: null,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  }, {
    companionPlantNames: ['Basil'],
    preferredZoneTypes: ['raisedBed', 'inGroundBed', 'trellis'],
  }),
  withCompatibility({
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
  }, {
    preferredZoneTypes: ['raisedBed', 'inGroundBed', 'container'],
  }),
];

const previousDocument: PlannerDocument = {
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
    sunProfile: {
      shadeEdge: 'north',
      shadeDepthCells: 0,
      partShadeDepthCells: 0,
    },
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [
    {
      id: 'zone-1',
      gardenPlanId: 'plan-1',
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
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      id: 'zone-2',
      gardenPlanId: 'plan-1',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'South Bed',
      notes: '',
      gridX: 7,
      gridY: 1,
      widthCells: 3,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-basil',
      zoneId: 'zone-1',
      notes: '',
      gridX: 1,
      gridY: 2,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      id: 'placement-2',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-tomato',
      zoneId: 'zone-2',
      notes: '',
      gridX: 3,
      gridY: 4,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
};

const activeDocument: PlannerDocument = {
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
    sunProfile: {
      shadeEdge: 'north',
      shadeDepthCells: 0,
      partShadeDepthCells: 0,
    },
    createdAt: '2027-04-12T00:00:00.000Z',
    updatedAt: '2027-04-12T00:00:00.000Z',
  },
  zones: [
    {
      id: 'zone-3',
      gardenPlanId: 'plan-2',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'North Bed',
      notes: '',
      gridX: 1,
      gridY: 1,
      widthCells: 5,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2027-04-12T00:00:00.000Z',
      updatedAt: '2027-04-12T00:00:00.000Z',
    },
    {
      id: 'zone-4',
      gardenPlanId: 'plan-2',
      type: 'container',
      shape: 'rectangle',
      name: 'East Bed',
      notes: '',
      gridX: 12,
      gridY: 1,
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
      id: 'placement-3',
      gardenPlanId: 'plan-2',
      plantDefinitionId: 'plant-basil',
      zoneId: 'zone-4',
      notes: '',
      gridX: 1,
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
      id: 'placement-4',
      gardenPlanId: 'plan-2',
      plantDefinitionId: 'plant-kale',
      zoneId: 'zone-3',
      notes: '',
      gridX: 3,
      gridY: 4,
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

const futureDocument: PlannerDocument = {
  plan: {
    id: 'plan-3',
    name: 'Kitchen Garden 2028',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2028',
    sunProfile: {
      shadeEdge: 'north',
      shadeDepthCells: 0,
      partShadeDepthCells: 0,
    },
    createdAt: '2028-04-12T00:00:00.000Z',
    updatedAt: '2028-04-12T00:00:00.000Z',
  },
  zones: [
    {
      id: 'zone-5',
      gardenPlanId: 'plan-3',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'North Bed',
      notes: '',
      gridX: 1,
      gridY: 1,
      widthCells: 5,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2028-04-12T00:00:00.000Z',
      updatedAt: '2028-04-12T00:00:00.000Z',
    },
    {
      id: 'zone-6',
      gardenPlanId: 'plan-3',
      type: 'container',
      shape: 'rectangle',
      name: 'East Bed',
      notes: '',
      gridX: 12,
      gridY: 1,
      widthCells: 2,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'container',
      createdAt: '2028-04-12T00:00:00.000Z',
      updatedAt: '2028-04-12T00:00:00.000Z',
    },
  ],
  placements: [
    {
      id: 'placement-5',
      gardenPlanId: 'plan-3',
      plantDefinitionId: 'plant-basil',
      zoneId: 'zone-5',
      notes: '',
      gridX: 1,
      gridY: 2,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2028-04-12T00:00:00.000Z',
      updatedAt: '2028-04-12T00:00:00.000Z',
    },
    {
      id: 'placement-6',
      gardenPlanId: 'plan-3',
      plantDefinitionId: 'plant-tomato',
      zoneId: 'zone-5',
      notes: '',
      gridX: 3,
      gridY: 2,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2028-04-12T00:00:00.000Z',
      updatedAt: '2028-04-12T00:00:00.000Z',
    },
  ],
};

const initialState = useGardenStore.getState();

beforeEach(() => {
  getPlanDocumentMock.mockReset();
  getPlanDocumentMock.mockImplementation(async (planId: string) => {
    if (planId === 'plan-1') {
      return previousDocument;
    }

    if (planId === 'plan-3') {
      return futureDocument;
    }

    return null;
  });
  getGardenRepositorySpy.mockReturnValue({
    getPlanDocument: getPlanDocumentMock,
  } as unknown as ReturnType<typeof repositoryFactory.getGardenRepository>);

  act(() => {
    useGardenStore.setState({
      ...initialState,
      activeDocument,
      activePlanId: activeDocument.plan.id,
      planSummaries: [
        {
          id: 'plan-1',
          name: 'Kitchen Garden 2026',
          locationLabel: 'Home',
          measurementSystem: 'imperial',
          widthCells: 20,
          heightCells: 12,
          cellSizeMm: 305,
          seasonTag: '2026',
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
          updatedAt: '2027-04-12T00:00:00.000Z',
        },
        {
          id: 'plan-3',
          name: 'Kitchen Garden 2028',
          locationLabel: 'Home',
          measurementSystem: 'imperial',
          widthCells: 20,
          heightCells: 12,
          cellSizeMm: 305,
          seasonTag: '2028',
          updatedAt: '2028-04-12T00:00:00.000Z',
        },
      ],
      plantDefinitions,
      saveSeasonalTask: vi.fn().mockResolvedValue(undefined),
    });
  });

  usePlannerUiStore.setState(plannerUiInitialState);
});

afterEach(() => {
  cleanup();
  getGardenRepositorySpy.mockReset();

  act(() => {
    useGardenStore.setState(initialState);
  });
  usePlannerUiStore.setState(plannerUiInitialState);
});

describe('PlannerSeasonPanel', () => {
  it('shows companion planting cues for compatible crops in the current plan', async () => {
    const companionDocument: PlannerDocument = {
      ...activeDocument,
      placements: [
        {
          ...activeDocument.placements[0]!,
          plantDefinitionId: 'plant-basil',
          zoneId: 'zone-3',
        },
        {
          ...activeDocument.placements[1]!,
          plantDefinitionId: 'plant-tomato',
          zoneId: 'zone-3',
        },
      ],
    };

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: companionDocument,
        activePlanId: companionDocument.plan.id,
      });
    });

    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={5} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: /Companion guidance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tomato + Basil')).toBeInTheDocument();
    expect(
      screen.getByText(/Tomato and Basil are marked as companion plants/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/North Bed stays mostly full sun/i)).toBeInTheDocument();
  });

  it('shows only defensible missing companion suggestions when a crop is planted alone', async () => {
    const suggestionDocument: PlannerDocument = {
      ...activeDocument,
      placements: [
        {
          ...activeDocument.placements[0]!,
          plantDefinitionId: 'plant-tomato',
          zoneId: 'zone-3',
        },
      ],
    };

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: suggestionDocument,
        activePlanId: suggestionDocument.plan.id,
      });
    });

    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={5} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: /Companion guidance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Add Basil near Tomato')).toBeInTheDocument();
    expect(
      screen.getByText(/Basil is marked as a companion plant for Tomato/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Add Marigold near Tomato')).not.toBeInTheDocument();
    expect(screen.getByText(/May is inside Basil planting window/i)).toBeInTheDocument();
  });

  it('shows rotation insights and season navigation for the active plan family', async () => {
    render(
      <MemoryRouter>
        <PlannerSeasonPanel />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Rotation snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open 2026/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open 2028/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Basil · Genovese')).length).toBeGreaterThan(0);
    expect(screen.getByText('Lamiaceae')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Rotation cautions/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Move that family to a different bed or give this area a rest/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Kale · Lacinato').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tomato · Sun Gold').length).toBeGreaterThan(0);
  });

  it('lets the user compare the current plan against any saved season in the family', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PlannerSeasonPanel />
      </MemoryRouter>,
    );

    const compareSelect = await screen.findByLabelText(/Compare against/i);
    expect(compareSelect).toHaveValue('plan-1');
    expect(await screen.findByRole('heading', { name: /Zone shifts/i })).toBeInTheDocument();
    expect(screen.getByText(/Added zone this season: East Bed/i)).toBeInTheDocument();
    expect(screen.getByText(/Removed Tomato · Sun Gold from South Bed/i)).toBeInTheDocument();

    await user.selectOptions(compareSelect, 'plan-3');

    expect(getPlanDocumentMock).toHaveBeenCalledWith('plan-3');
    expect(compareSelect).toHaveValue('plan-3');
    expect(screen.getByText(/Removed Tomato · Sun Gold from North Bed/i)).toBeInTheDocument();
  });

  it('adds a rotation caution to the season workbench', async () => {
    const user = userEvent.setup();
    const saveSeasonalTask = useGardenStore.getState().saveSeasonalTask;

    render(
      <MemoryRouter>
        <PlannerSeasonPanel />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Rotation cautions/i });

    await user.click(
      screen.getByRole('button', {
        name: /Add workbench task Rotate repeated families/i,
      }),
    );

    expect(saveSeasonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rotate repeated families',
        kind: 'task',
        plantDefinitionId: null,
        note: expect.stringContaining('Lamiaceae repeats from the previous saved season'),
      }),
    );
  });

  it('arms the missing companion crop and focuses its zone', async () => {
    const user = userEvent.setup();
    const suggestionDocument: PlannerDocument = {
      ...activeDocument,
      placements: [
        {
          ...activeDocument.placements[0]!,
          plantDefinitionId: 'plant-tomato',
          zoneId: 'zone-3',
        },
      ],
    };

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: suggestionDocument,
        activePlanId: suggestionDocument.plan.id,
      });
    });

    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={5} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Companion guidance/i });

    await user.click(
      screen.getByRole('button', {
        name: /Place Basil in North Bed/i,
      }),
    );

    expect(usePlannerUiStore.getState().selection).toMatchObject({
      type: 'zone',
      id: 'zone-3',
      ids: ['zone-3'],
    });
    expect(usePlannerUiStore.getState().armedPlantId).toBe('plant-basil');
    expect(usePlannerUiStore.getState().activePanel).toBe('plants');
  });

  it('selects the current zone from a zone shift card', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PlannerSeasonPanel />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Zone shifts/i });

    await user.click(
      screen.getByRole('button', {
        name: /Select zone East Bed/i,
      }),
    );

    expect(usePlannerUiStore.getState().selection).toMatchObject({
      type: 'zone',
      id: 'zone-4',
      ids: ['zone-4'],
    });
  });

  it('focuses the current crop from a crop shift card', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PlannerSeasonPanel />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Crop shifts/i });

    await user.click(
      screen.getByRole('button', {
        name: /Focus crop Basil · Genovese/i,
      }),
    );

    expect(usePlannerUiStore.getState().selection).toMatchObject({
      type: 'placement',
      id: 'placement-3',
      ids: ['placement-3'],
    });
  });

  it('arms a crop from a seasonality cue', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={4} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Seasonality cues/i });

    await user.click(
      screen.getByRole('button', {
        name: /Arm crop Kale/i,
      }),
    );

    expect(usePlannerUiStore.getState().armedPlantId).toBe('plant-kale');
    expect(usePlannerUiStore.getState().activePanel).toBe('plants');
  });

  it('adds a seasonality cue to the workbench', async () => {
    const user = userEvent.setup();
    const saveSeasonalTask = useGardenStore.getState().saveSeasonalTask;

    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={4} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Seasonality cues/i });

    await user.click(
      screen.getByRole('button', {
        name: /Add workbench task Plant Kale now/i,
      }),
    );

    expect(saveSeasonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Plant Kale now',
        kind: 'task',
        plantDefinitionId: 'plant-kale',
        dueMonth: 4,
        note: expect.stringContaining('Kale · Lacinato is in its April planting window'),
      }),
    );
  });

  it('adds a harvest cue to the workbench with a harvest task kind', async () => {
    const user = userEvent.setup();
    const saveSeasonalTask = useGardenStore.getState().saveSeasonalTask;

    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={4} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Seasonality cues/i });

    await user.click(
      screen.getByRole('button', {
        name: /Add workbench task Harvest Basil in June/i,
      }),
    );

    expect(saveSeasonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Harvest Basil in June',
        kind: 'harvest',
        plantDefinitionId: 'plant-basil',
        dueMonth: 6,
        note: expect.stringContaining('50 days'),
      }),
    );
  });
});
