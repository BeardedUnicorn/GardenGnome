import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlannerSidebar } from '@/features/planner/PlannerSidebar';
import type { PlantDefinition } from '@/domain/plants/models';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const withCompatibility = (
  definition: PlantDefinition,
  compatibility: {
    companionPlantNames?: string[];
    conflictPlantNames?: string[];
    preferredZoneTypes?: string[];
  } = {},
) =>
  ({
    ...definition,
    companionPlantNames: [],
    conflictPlantNames: [],
    preferredZoneTypes: [],
    ...compatibility,
  }) as PlantDefinition;

const plant: PlantDefinition = withCompatibility({
  id: 'plant-1',
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
  successionIntervalDays: null,
  notes: 'Compact and productive.',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  companionPlantNames: ['Tomato'],
  preferredZoneTypes: ['raisedBed', 'container'],
});

const initialGardenState = useGardenStore.getState();
const initialPlannerUiState = usePlannerUiStore.getState();

beforeEach(() => {
  act(() => {
    useGardenStore.setState({
      ...initialGardenState,
      plantDefinitions: [plant],
      togglePlantFavorite: vi.fn().mockResolvedValue(undefined),
      savePlantDefinition: vi.fn().mockResolvedValue(undefined),
      deletePlantDefinition: vi.fn().mockResolvedValue(undefined),
    });
    usePlannerUiStore.setState({
      ...initialPlannerUiState,
      activePanel: 'plants',
      armedPlantId: plant.id,
      placementPattern: 'single',
      placementCount: 4,
    });
  });
});

afterEach(() => {
  cleanup();

  act(() => {
    useGardenStore.setState(initialGardenState);
    usePlannerUiStore.setState(initialPlannerUiState);
  });
});

describe('PlannerSidebar', () => {
  it('updates the placement helper mode and count from the plants panel', async () => {
    const user = userEvent.setup();

    render(<PlannerSidebar />);

    await user.click(screen.getByRole('button', { name: 'row' }));

    const countInput = screen.getByLabelText(/Plants per row/i);
    fireEvent.change(countInput, { target: { value: '6' } });

    expect(usePlannerUiStore.getState().placementPattern).toBe('row');
    expect(usePlannerUiStore.getState().placementCount).toBe(6);
    expect(
      screen.getByRole('button', { name: /Armed · row/i }),
    ).toBeInTheDocument();
  });

  it('switches the placement helper into fill mode', async () => {
    const user = userEvent.setup();

    render(<PlannerSidebar />);

    await user.click(screen.getByRole('button', { name: 'fill' }));

    expect(usePlannerUiStore.getState().placementPattern).toBe('fill');
    expect(
      screen.getByText(/Click or drop inside a growable zone to fill it with spaced footprints/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Plants per/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Armed · fill/i }),
    ).toBeInTheDocument();
  });

  it('filters plants by favorites and category metadata', async () => {
    const user = userEvent.setup();

    useGardenStore.setState({
      ...useGardenStore.getState(),
      plantDefinitions: [
        plant,
        {
          ...plant,
          id: 'plant-2',
          commonName: 'Tomato',
          category: 'fruiting',
          isFavorite: true,
          plantingWindowStartMonth: 4,
          plantingWindowEndMonth: 6,
          notes: 'Sweet cherry tomato.',
        },
      ],
    });

    render(<PlannerSidebar />);

    await user.selectOptions(screen.getByLabelText(/Category filter/i), 'fruiting');

    expect(screen.queryByText(/Basil/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tomato/i })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Favorites only/i }));

    expect(screen.getByRole('heading', { name: /Tomato/i })).toBeInTheDocument();
    expect(screen.queryByText(/Basil/i)).not.toBeInTheDocument();
  });

  it('filters plants by planting month metadata', async () => {
    const user = userEvent.setup();

    useGardenStore.setState({
      ...useGardenStore.getState(),
      plantDefinitions: [
        plant,
        {
          ...plant,
          id: 'plant-3',
          commonName: 'Pea',
          category: 'leafy',
          plantingWindowStartMonth: 2,
          plantingWindowEndMonth: 4,
          notes: 'Cool-season crop.',
        },
      ],
    });

    render(<PlannerSidebar />);

    await user.selectOptions(screen.getByLabelText(/Planting month/i), '2');

    expect(screen.getByRole('heading', { name: /Pea/i })).toBeInTheDocument();
    expect(screen.queryByText(/Basil/i)).not.toBeInTheDocument();
  });

  it('saves compatibility metadata from the plant editor', async () => {
    const user = userEvent.setup();
    const savePlantDefinition = vi.fn().mockResolvedValue(undefined);

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        savePlantDefinition,
      });
    });

    render(<PlannerSidebar />);

    await user.click(screen.getByRole('button', { name: /Add custom plant/i }));
    fireEvent.change(screen.getByLabelText(/Common name/i), {
      target: { value: 'Carrot' },
    });
    fireEvent.change(screen.getByLabelText(/Plant family/i), {
      target: { value: 'Apiaceae' },
    });
    fireEvent.change(screen.getByLabelText(/Companion plant names/i), {
      target: { value: 'Thyme, Radish' },
    });
    fireEvent.change(screen.getByLabelText(/Conflict plant names/i), {
      target: { value: 'Dill' },
    });
    await user.click(screen.getByRole('checkbox', { name: /Raised bed/i }));
    await user.click(screen.getByRole('checkbox', { name: /In-ground bed/i }));
    await user.click(screen.getByRole('button', { name: /Create plant/i }));

    expect(savePlantDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        commonName: 'Carrot',
        plantFamily: 'Apiaceae',
        companionPlantNames: 'Thyme, Radish',
        conflictPlantNames: 'Dill',
        preferredZoneTypes: ['raisedBed', 'inGroundBed'],
      }),
      undefined,
    );
  });

  it('toggles favorites directly from the plant card', async () => {
    const user = userEvent.setup();
    const togglePlantFavorite = vi.fn().mockResolvedValue(undefined);

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        togglePlantFavorite,
      });
    });

    render(<PlannerSidebar />);

    await user.click(screen.getByRole('button', { name: /Favorite Basil/i }));

    expect(togglePlantFavorite).toHaveBeenCalledWith('plant-1');
  });

  it('toggles irrigation visibility from the layers panel', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        activePanel: 'layers',
      });
    });

    render(<PlannerSidebar />);

    await user.click(screen.getByRole('checkbox', { name: /Irrigation/i }));

    expect(usePlannerUiStore.getState().visibleLayers.irrigation).toBe(true);
  });

  it('toggles notes visibility from the layers panel', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        activePanel: 'layers',
      });
    });

    render(<PlannerSidebar />);

    await user.click(screen.getByRole('checkbox', { name: /Notes/i }));

    expect(usePlannerUiStore.getState().visibleLayers.notes).toBe(true);
  });

  it('shows extended zone tools in the area palette', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        activePanel: 'tools',
      });
    });

    render(<PlannerSidebar />);

    expect(screen.getByRole('button', { name: /Trellis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Orchard \/ perennial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Greenhouse zone/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Decorative planting area/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compost area/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Trellis/i }));

    expect(usePlannerUiStore.getState().activeTool).toBe('trellis');
  });
});
