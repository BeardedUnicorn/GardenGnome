import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlannerDocument, SeasonalTask } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { PlannerSeasonWorkbench } from '@/features/planner/PlannerSeasonWorkbench';
import { useGardenStore } from '@/stores/gardenStore';

const activeDocument: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 12,
    heightCells: 10,
    cellSizeMm: 305,
    seasonTag: '2026',
    seasonFamilyId: 'plan-1',
    sourcePlanId: null,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-1',
      zoneId: null,
      notes: '',
      gridX: 1,
      gridY: 1,
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

const plantDefinitions: PlantDefinition[] = [
  {
    id: 'plant-1',
    commonName: 'Basil',
    varietyName: 'Genovese',
    plantFamily: 'Lamiaceae',
    category: 'herb',
    lifecycle: 'annual',
    spacingMm: 203,
    spreadMm: 203,
    heightMm: 457,
    sunRequirement: 'fullSun',
    waterRequirement: 'moderate',
    daysToMaturity: 45,
    plantingWindowStartMonth: 5,
    plantingWindowEndMonth: 8,
    successionIntervalDays: 21,
    companionPlantNames: [],
    conflictPlantNames: [],
    preferredZoneTypes: ['raisedBed'],
    notes: '',
    isFavorite: false,
    isCustom: true,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
];

const seasonalTasks: SeasonalTask[] = [
  {
    id: 'seasonal-task-1',
    gardenPlanId: 'plan-1',
    plantDefinitionId: 'plant-1',
    placementId: null,
    sourceKey: 'plant-1-window-open',
    kind: 'plant',
    status: 'pending',
    dueMonth: 5,
    title: 'Plant Basil now',
    note: 'Basil · Genovese is in its May planting window.',
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  {
    id: 'seasonal-task-2',
    gardenPlanId: 'plan-1',
    plantDefinitionId: 'plant-1',
    placementId: null,
    sourceKey: 'plant-1-succession',
    kind: 'succession',
    status: 'done',
    dueMonth: 5,
    title: 'Succession sow Basil',
    note: 'Basil · Genovese can be re-sown every 21 days while the planting window stays open.',
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
];

const initialState = useGardenStore.getState();

beforeEach(() => {
  act(() => {
    useGardenStore.setState({
      ...initialState,
      activeDocument,
      plantDefinitions,
      seasonalTasks,
      syncSeasonalTasks: vi.fn().mockResolvedValue(undefined),
      setSeasonalTaskStatus: vi.fn().mockResolvedValue(undefined),
      saveSeasonalTask: vi.fn().mockResolvedValue(undefined),
      deleteSeasonalTask: vi.fn().mockResolvedValue(undefined),
    });
  });
});

afterEach(() => {
  cleanup();

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('PlannerSeasonWorkbench', () => {
  it('renders persisted tasks and syncs seasonal guidance for the active plan', async () => {
    const syncSeasonalTasks = useGardenStore.getState().syncSeasonalTasks;

    render(<PlannerSeasonWorkbench referenceMonth={5} />);

    expect(screen.getByRole('heading', { name: /Season workbench/i })).toBeInTheDocument();
    expect(screen.getByText('Plant Basil now')).toBeInTheDocument();
    expect(screen.getByText('Succession sow Basil')).toBeInTheDocument();
    expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    expect(syncSeasonalTasks).toHaveBeenCalledWith(5);
  });

  it('marks a task complete from the workbench', async () => {
    const user = userEvent.setup();
    const setSeasonalTaskStatus = useGardenStore.getState().setSeasonalTaskStatus;

    render(<PlannerSeasonWorkbench referenceMonth={5} />);

    await user.click(screen.getByRole('button', { name: /Done Plant Basil now/i }));

    expect(setSeasonalTaskStatus).toHaveBeenCalledWith('seasonal-task-1', 'done');
  });

  it('creates a manual seasonal task from the workbench form', async () => {
    const user = userEvent.setup();
    const saveSeasonalTask = useGardenStore.getState().saveSeasonalTask;

    render(<PlannerSeasonWorkbench referenceMonth={5} />);

    await user.type(screen.getByLabelText(/Task title/i), 'Mulch the basil bed');
    await user.type(
      screen.getByLabelText(/Task notes/i),
      'Top up compost before the next heat wave.',
    );
    await user.selectOptions(screen.getByLabelText(/Due month/i), '6');
    await user.selectOptions(screen.getByLabelText(/Linked crop/i), 'plant-1');
    await user.click(screen.getByRole('button', { name: /Add task/i }));

    expect(saveSeasonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mulch the basil bed',
        note: 'Top up compost before the next heat wave.',
        dueMonth: 6,
        kind: 'task',
        plantDefinitionId: 'plant-1',
      }),
      undefined,
    );
  });

  it('creates a manual harvest task from the workbench form', async () => {
    const user = userEvent.setup();
    const saveSeasonalTask = useGardenStore.getState().saveSeasonalTask;

    render(<PlannerSeasonWorkbench referenceMonth={5} />);

    await user.type(screen.getByLabelText(/Task title/i), 'Harvest Basil bunches');
    await user.selectOptions(screen.getByLabelText(/Task type/i), 'harvest');
    await user.selectOptions(screen.getByLabelText(/Due month/i), '7');
    await user.selectOptions(screen.getByLabelText(/Linked crop/i), 'plant-1');
    await user.click(screen.getByRole('button', { name: /Add task/i }));

    expect(saveSeasonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Harvest Basil bunches',
        dueMonth: 7,
        kind: 'harvest',
        plantDefinitionId: 'plant-1',
      }),
      undefined,
    );
  });

  it('filters the workbench list by status', async () => {
    const user = userEvent.setup();

    render(<PlannerSeasonWorkbench referenceMonth={5} />);

    await user.selectOptions(screen.getByLabelText(/Status filter/i), 'done');

    expect(screen.queryByText('Plant Basil now')).not.toBeInTheDocument();
    expect(screen.getByText('Succession sow Basil')).toBeInTheDocument();
  });
});
