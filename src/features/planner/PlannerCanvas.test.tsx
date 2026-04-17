import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { PlannerCanvas } from '@/features/planner/PlannerCanvas';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

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
    seasonFamilyId: 'plan-1',
    sourcePlanId: null,
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
      zoneId: 'zone-1',
      notes: '',
      gridX: 2,
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
      plantDefinitionId: 'plant-2',
      zoneId: 'zone-2',
      notes: '',
      gridX: 7,
      gridY: 6,
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
    commonName: 'Tomato',
    varietyName: 'Roma',
    plantFamily: 'Solanaceae',
    category: 'fruiting',
    lifecycle: 'annual',
    spacingMm: 305,
    spreadMm: 305,
    heightMm: 900,
    sunRequirement: 'fullSun',
    waterRequirement: 'moderate',
    daysToMaturity: 75,
    plantingWindowStartMonth: 4,
    plantingWindowEndMonth: 6,
    successionIntervalDays: null,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  {
    id: 'plant-2',
    commonName: 'Basil',
    varietyName: 'Genovese',
    plantFamily: 'Lamiaceae',
    category: 'herb',
    lifecycle: 'annual',
    spacingMm: 305,
    spreadMm: 305,
    heightMm: 457,
    sunRequirement: 'fullSun',
    waterRequirement: 'moderate',
    daysToMaturity: 50,
    plantingWindowStartMonth: 5,
    plantingWindowEndMonth: 8,
    successionIntervalDays: null,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
];

const initialGardenState = useGardenStore.getState();
const initialPlannerUiState = usePlannerUiStore.getState();

beforeEach(() => {
  act(() => {
    useGardenStore.setState({
      ...initialGardenState,
      activeDocument: structuredClone(document),
      plantDefinitions: structuredClone(plantDefinitions),
      validationIssues: [],
    });
    usePlannerUiStore.setState({
      ...initialPlannerUiState,
      visibleLayers: {
        ...initialPlannerUiState.visibleLayers,
        measurements: true,
        sunShade: true,
        irrigation: false,
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

describe('PlannerCanvas measurements', () => {
  it('renders plan and zone dimensions when the measurements layer is enabled', () => {
    render(<PlannerCanvas />);

    expect(screen.getByText('Plan width 12 ft')).toBeInTheDocument();
    expect(screen.getByText('Plan height 10 ft')).toBeInTheDocument();
    expect(screen.getByText('4 ft × 2 ft')).toBeInTheDocument();
  });

  it('renders sun exposure overlay labels when the sun layer is enabled', () => {
    render(<PlannerCanvas />);

    expect(screen.getByText('Shade')).toBeInTheDocument();
    expect(screen.getByText('Part sun')).toBeInTheDocument();
    expect(screen.getByText('Full sun')).toBeInTheDocument();
  });

  it('renders irrigation overlay labels when the irrigation layer is enabled', () => {
    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        visibleLayers: {
          ...usePlannerUiStore.getState().visibleLayers,
          irrigation: true,
        },
      });
    });

    render(<PlannerCanvas />);

    expect(screen.getAllByText('Soaker line')).toHaveLength(2);
    expect(screen.getAllByText('Moderate water demand')).toHaveLength(2);
  });

  it('renders zone and plant note overlays when the notes layer is enabled', () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: {
          ...structuredClone(document),
          zones: [
            {
              ...structuredClone(document.zones[0]!),
              notes: 'North edge stays damp after storms.',
            },
            structuredClone(document.zones[1]!),
          ],
          placements: [
            {
              ...structuredClone(document.placements[0]!),
              notes: 'Prune weekly once it warms up.',
            },
            structuredClone(document.placements[1]!),
          ],
        },
      });
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        visibleLayers: {
          ...usePlannerUiStore.getState().visibleLayers,
          notes: true,
        },
      });
    });

    render(<PlannerCanvas />);

    expect(screen.getByText(/Note: North edge stays damp/i)).toBeInTheDocument();
    expect(screen.getByText(/Note: Prune weekly/i)).toBeInTheDocument();
  });

  it('fills a growable zone with armed crop placements', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: {
          ...structuredClone(document),
          placements: [],
        },
      });
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        armedPlantId: 'plant-2',
        placementPattern: 'fill',
      });
    });

    fireEvent.click(stage!, {
      clientX: 96,
      clientY: 96,
    });

    const placements = useGardenStore.getState().activeDocument?.placements ?? [];

    expect(placements).toHaveLength(8);
    expect(placements.every((placement) => placement.layoutPattern === 'fill')).toBe(true);
    expect(placements.every((placement) => placement.zoneId === 'zone-1')).toBe(true);
    expect(placements.map((placement) => [placement.gridX, placement.gridY])).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ]);
  });

  it('drops a dragged crop card onto the canvas to create a placement', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: {
          ...structuredClone(document),
          placements: [],
        },
      });
    });

    const dataTransfer = {
      getData: (type: string) =>
        type === 'application/x-gardengnome-plant-id' || type === 'text/plain'
          ? 'plant-2'
          : '',
    };

    const dragEnterEvent = createEvent.dragEnter(stage!, { dataTransfer });
    Object.defineProperty(dragEnterEvent, 'clientX', { value: 96 });
    Object.defineProperty(dragEnterEvent, 'clientY', { value: 96 });
    fireEvent(stage!, dragEnterEvent);
    expect(stage).toHaveClass('planner-stage--drop-target');

    const dragOverEvent = createEvent.dragOver(stage!, { dataTransfer });
    Object.defineProperty(dragOverEvent, 'clientX', { value: 96 });
    Object.defineProperty(dragOverEvent, 'clientY', { value: 96 });
    fireEvent(stage!, dragOverEvent);

    const dropEvent = createEvent.drop(stage!, { dataTransfer });
    Object.defineProperty(dropEvent, 'clientX', { value: 96 });
    Object.defineProperty(dropEvent, 'clientY', { value: 96 });
    fireEvent(stage!, dropEvent);

    const placements = useGardenStore.getState().activeDocument?.placements ?? [];

    expect(placements).toHaveLength(1);
    expect(placements[0]?.plantDefinitionId).toBe('plant-2');
    expect(placements[0]?.gridX).toBe(2);
    expect(placements[0]?.gridY).toBe(2);
    expect(stage).not.toHaveClass('planner-stage--drop-target');
  });

  it('drags a zone to a new grid position', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    fireEvent.pointerDown(screen.getByText('North Bed'), {
      clientX: 84,
      clientY: 84,
    });
    fireEvent.pointerMove(stage!, {
      clientX: 84 + 84,
      clientY: 84 + 42,
    });
    fireEvent.pointerUp(stage!, {
      clientX: 84 + 84,
      clientY: 84 + 42,
    });

    const draggedZone = useGardenStore.getState().activeDocument?.zones[0];
    expect(draggedZone?.gridX).toBe(3);
    expect(draggedZone?.gridY).toBe(2);
  });

  it('moves assigned plant placements with a dragged zone', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    fireEvent.pointerDown(screen.getByText('North Bed'), {
      clientX: 84,
      clientY: 84,
    });
    fireEvent.pointerMove(stage!, {
      clientX: 84 + 84,
      clientY: 84 + 42,
    });
    fireEvent.pointerUp(stage!, {
      clientX: 84 + 84,
      clientY: 84 + 42,
    });

    const movedPlacement = useGardenStore.getState().activeDocument?.placements[0];
    expect(movedPlacement).toMatchObject({
      gridX: 4,
      gridY: 3,
      zoneId: 'zone-1',
    });
  });

  it('drags a plant placement to a new grid position', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    fireEvent.pointerDown(screen.getByText('Tomato'), {
      clientX: 126,
      clientY: 126,
    });
    fireEvent.pointerMove(stage!, {
      clientX: 126 + 42,
      clientY: 126 + 84,
    });
    fireEvent.pointerUp(stage!, {
      clientX: 126 + 42,
      clientY: 126 + 84,
    });

    const draggedPlacement = useGardenStore.getState().activeDocument?.placements[0];
    expect(draggedPlacement?.gridX).toBe(3);
    expect(draggedPlacement?.gridY).toBe(4);
  });

  it('reassigns a dragged plant placement to the growable zone it now occupies', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    fireEvent.pointerDown(screen.getByText('Tomato'), {
      clientX: 126,
      clientY: 126,
    });
    fireEvent.pointerMove(stage!, {
      clientX: 126 + 210,
      clientY: 126 + 168,
    });
    fireEvent.pointerUp(stage!, {
      clientX: 126 + 210,
      clientY: 126 + 168,
    });

    const movedPlacement = useGardenStore.getState().activeDocument?.placements[0];
    expect(movedPlacement).toMatchObject({
      gridX: 7,
      gridY: 6,
      zoneId: 'zone-2',
    });
  });

  it('drags a multi-selected zone group together', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

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

    fireEvent.pointerDown(screen.getByText('North Bed'), {
      clientX: 84,
      clientY: 84,
    });
    fireEvent.pointerMove(stage!, {
      clientX: 84 + 42,
      clientY: 84 + 84,
    });
    fireEvent.pointerUp(stage!, {
      clientX: 84 + 42,
      clientY: 84 + 84,
    });

    const draggedZones = useGardenStore.getState().activeDocument?.zones;
    expect(draggedZones?.map((zone) => ({ id: zone.id, gridX: zone.gridX, gridY: zone.gridY }))).toEqual([
      { id: 'zone-1', gridX: 2, gridY: 3 },
      { id: 'zone-2', gridX: 7, gridY: 7 },
    ]);
  });

  it('drags a multi-selected plant group together', () => {
    const { container } = render(<PlannerCanvas />);
    const stage = container.querySelector('.planner-stage');

    expect(stage).not.toBeNull();

    act(() => {
      usePlannerUiStore.setState({
        ...usePlannerUiStore.getState(),
        selection: {
          type: 'placement',
          id: 'placement-2',
          ids: ['placement-1', 'placement-2'],
        },
      });
    });

    fireEvent.pointerDown(screen.getByText('Tomato'), {
      clientX: 126,
      clientY: 126,
    });
    fireEvent.pointerMove(stage!, {
      clientX: 126 + 84,
      clientY: 126 + 42,
    });
    fireEvent.pointerUp(stage!, {
      clientX: 126 + 84,
      clientY: 126 + 42,
    });

    const draggedPlacements = useGardenStore.getState().activeDocument?.placements;
    expect(
      draggedPlacements?.map((placement) => ({
        id: placement.id,
        gridX: placement.gridX,
        gridY: placement.gridY,
      })),
    ).toEqual([
      { id: 'placement-1', gridX: 4, gridY: 3 },
      { id: 'placement-2', gridX: 9, gridY: 7 },
    ]);
  });
});
