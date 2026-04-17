import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { PlannerInspector } from '@/features/planner/PlannerInspector';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const plant: PlantDefinition = {
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
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

const document: PlannerDocument = {
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
    sunProfile: {
      shadeEdge: 'north',
      shadeDepthCells: 2,
      partShadeDepthCells: 4,
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
      type: 'inGroundBed',
      shape: 'rectangle',
      name: 'South Bed',
      notes: '',
      gridX: 6,
      gridY: 5,
      widthCells: 3,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'in-ground-bed',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-1',
      zoneId: null,
      notes: '',
      gridX: 1,
      gridY: 2,
      footprintWidthCells: 2,
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
      plantDefinitionId: 'plant-1',
      zoneId: null,
      notes: '',
      gridX: 3,
      gridY: 4,
      footprintWidthCells: 2,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
};

const initialGardenState = useGardenStore.getState();
const initialPlannerUiState = usePlannerUiStore.getState();

beforeEach(() => {
  act(() => {
    useGardenStore.setState({
      ...initialGardenState,
      plantDefinitions: [plant],
      activeDocument: structuredClone(document),
    });
    usePlannerUiStore.setState({
      ...initialPlannerUiState,
      selection: {
        type: 'placement',
        id: 'placement-2',
        ids: ['placement-1', 'placement-2'],
      },
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

describe('PlannerInspector', () => {
  it('updates plan season tag and measurement system from the plan settings view', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'plan',
          id: null,
          ids: [],
        },
      });
    });

    render(<PlannerInspector />);

    await user.clear(screen.getByLabelText(/Season tag/i));
    await user.type(screen.getByLabelText(/Season tag/i), '2027');
    await user.selectOptions(screen.getByLabelText(/Measurement system/i), 'metric');

    const metricCellSizeInput = screen.getByLabelText(/Cell size \(mm\)/i);
    await user.clear(metricCellSizeInput);
    await user.type(metricCellSizeInput, '450');

    expect(useGardenStore.getState().activeDocument?.plan.seasonTag).toBe('2027');
    expect(useGardenStore.getState().activeDocument?.plan.measurementSystem).toBe('metric');
    expect(useGardenStore.getState().activeDocument?.plan.cellSizeMm).toBe(450);
  });

  it('converts imperial cell size edits back into integer millimeters', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'plan',
          id: null,
          ids: [],
        },
      });
    });

    render(<PlannerInspector />);

    const cellSizeInput = screen.getByLabelText(/Cell size \(inches\)/i);
    await user.clear(cellSizeInput);
    await user.type(cellSizeInput, '18');

    expect(useGardenStore.getState().activeDocument?.plan.cellSizeMm).toBe(457);
  });

  it('updates the plan sun profile from the plan settings view', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'plan',
          id: null,
          ids: [],
        },
      });
    });

    render(<PlannerInspector />);

    await user.selectOptions(screen.getByLabelText(/Shade edge/i), 'west');
    fireEvent.change(screen.getByLabelText(/Full shade depth \(cells\)/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/Part shade depth \(cells\)/i), {
      target: { value: '5' },
    });

    expect(useGardenStore.getState().activeDocument?.plan).toMatchObject({
      sunProfile: {
        shadeEdge: 'west',
        shadeDepthCells: 3,
        partShadeDepthCells: 5,
      },
    });
  });

  it('supports deleting a multi-selection of plant placements', async () => {
    const user = userEvent.setup();

    render(<PlannerInspector />);

    expect(screen.getByText(/2 plant placements selected/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Delete selected placements/i }));

    expect(useGardenStore.getState().activeDocument?.placements).toHaveLength(0);
    expect(usePlannerUiStore.getState().selection).toEqual({
      type: 'plan',
      id: null,
      ids: [],
    });
  });

  it('duplicates a selected zone', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'zone',
          id: 'zone-1',
          ids: ['zone-1'],
        },
      });
    });

    render(<PlannerInspector />);

    await user.click(screen.getByRole('button', { name: /Duplicate zone/i }));

    expect(useGardenStore.getState().activeDocument?.zones).toHaveLength(3);
    expect(useGardenStore.getState().activeDocument?.zones.at(-1)).toMatchObject({
      type: 'raisedBed',
      gridX: 2,
      gridY: 2,
      widthCells: 4,
      heightCells: 2,
    });
  });

  it('duplicates a multi-selection of zones', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'zone',
          id: 'zone-2',
          ids: ['zone-1', 'zone-2'],
        },
      });
    });

    render(<PlannerInspector />);

    await user.click(screen.getByRole('button', { name: /Duplicate selected zones/i }));

    expect(useGardenStore.getState().activeDocument?.zones).toHaveLength(4);
    expect(
      useGardenStore
        .getState()
        .activeDocument?.zones.slice(2)
        .map((zone) => ({
          type: zone.type,
          gridX: zone.gridX,
          gridY: zone.gridY,
        })),
    ).toEqual([
      {
        type: 'raisedBed',
        gridX: 2,
        gridY: 2,
      },
      {
        type: 'inGroundBed',
        gridX: 7,
        gridY: 6,
      },
    ]);
  });

  it('applies shared notes and rotates a multi-selection of zones', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'zone',
          id: 'zone-2',
          ids: ['zone-1', 'zone-2'],
        },
      });
    });

    render(<PlannerInspector />);

    await user.type(screen.getByLabelText(/Shared notes/i), 'Rotate together');
    await user.click(screen.getByRole('button', { name: /Apply notes to selected zones/i }));
    await user.click(screen.getByRole('button', { name: /Rotate selected zones 90°/i }));

    expect(
      useGardenStore.getState().activeDocument?.zones.map((zone) => ({
        notes: zone.notes,
        widthCells: zone.widthCells,
        heightCells: zone.heightCells,
        rotationDegrees: zone.rotationDegrees,
      })),
    ).toEqual([
      {
        notes: 'Rotate together',
        widthCells: 2,
        heightCells: 4,
        rotationDegrees: 90,
      },
      {
        notes: 'Rotate together',
        widthCells: 2,
        heightCells: 3,
        rotationDegrees: 90,
      },
    ]);
  });

  it('supports duplicating a multi-selection of plant placements', async () => {
    const user = userEvent.setup();

    render(<PlannerInspector />);

    await user.click(screen.getByRole('button', { name: /Duplicate selected placements/i }));

    expect(useGardenStore.getState().activeDocument?.placements).toHaveLength(4);
    expect(
      useGardenStore
        .getState()
        .activeDocument?.placements.slice(2)
        .map((placement) => ({
          gridX: placement.gridX,
          gridY: placement.gridY,
          zoneId: placement.zoneId,
          plantDefinitionId: placement.plantDefinitionId,
        })),
    ).toEqual([
      {
        gridX: 2,
        gridY: 3,
        zoneId: null,
        plantDefinitionId: 'plant-1',
      },
      {
        gridX: 4,
        gridY: 5,
        zoneId: null,
        plantDefinitionId: 'plant-1',
      },
    ]);
  });

  it('applies shared quantity, notes, and rotation to a multi-selection of placements', async () => {
    const user = userEvent.setup();

    render(<PlannerInspector />);

    await user.clear(screen.getByLabelText(/Shared quantity/i));
    await user.type(screen.getByLabelText(/Shared quantity/i), '3');
    await user.type(screen.getByLabelText(/Shared notes/i), 'Grouped update');
    await user.click(
      screen.getByRole('button', { name: /Apply edits to selected placements/i }),
    );
    await user.click(screen.getByRole('button', { name: /Rotate selected plants 90°/i }));

    expect(
      useGardenStore.getState().activeDocument?.placements.map((placement) => ({
        quantity: placement.quantity,
        notes: placement.notes,
        footprintWidthCells: placement.footprintWidthCells,
        footprintHeightCells: placement.footprintHeightCells,
        rotationDegrees: placement.rotationDegrees,
      })),
    ).toEqual([
      {
        quantity: 3,
        notes: 'Grouped update',
        footprintWidthCells: 1,
        footprintHeightCells: 2,
        rotationDegrees: 90,
      },
      {
        quantity: 3,
        notes: 'Grouped update',
        footprintWidthCells: 1,
        footprintHeightCells: 2,
        rotationDegrees: 90,
      },
    ]);
  });

  it('rotates a selected rectangular zone by 90 degrees', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'zone',
          id: 'zone-1',
          ids: ['zone-1'],
        },
      });
    });

    render(<PlannerInspector />);

    await user.click(screen.getByRole('button', { name: /Rotate zone 90°/i }));

    expect(useGardenStore.getState().activeDocument?.zones[0]).toMatchObject({
      widthCells: 2,
      heightCells: 4,
      rotationDegrees: 90,
    });
  });

  it('rotates a selected plant footprint by 90 degrees', async () => {
    const user = userEvent.setup();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'placement',
          id: 'placement-1',
          ids: ['placement-1'],
        },
      });
    });

    render(<PlannerInspector />);

    await user.click(screen.getByRole('button', { name: /Rotate plant 90°/i }));

    expect(useGardenStore.getState().activeDocument?.placements[0]).toMatchObject({
      footprintWidthCells: 1,
      footprintHeightCells: 2,
      rotationDegrees: 90,
    });
  });
});
