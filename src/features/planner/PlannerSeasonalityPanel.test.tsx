import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { PlannerSeasonPanel } from '@/features/planner/PlannerSeasonPanel';
import * as repositoryFactory from '@/repositories/repositoryFactory';
import { useGardenStore } from '@/stores/gardenStore';

const getPlanDocumentMock = vi.fn();
const getGardenRepositorySpy = vi.spyOn(repositoryFactory, 'getGardenRepository');

const plantDefinitions: PlantDefinition[] = [
  {
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
  },
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
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [],
  placements: [],
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
    createdAt: '2027-04-12T00:00:00.000Z',
    updatedAt: '2027-04-12T00:00:00.000Z',
  },
  zones: [],
  placements: [
    {
      id: 'placement-basil',
      gardenPlanId: 'plan-2',
      plantDefinitionId: 'plant-basil',
      zoneId: null,
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
      id: 'placement-kale',
      gardenPlanId: 'plan-2',
      plantDefinitionId: 'plant-kale',
      zoneId: null,
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

const initialState = useGardenStore.getState();

beforeEach(() => {
  getPlanDocumentMock.mockReset();
  getPlanDocumentMock.mockResolvedValue(previousDocument);
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
      ],
      plantDefinitions,
    });
  });
});

afterEach(() => {
  cleanup();
  getGardenRepositorySpy.mockReset();

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('PlannerSeasonPanel seasonality guidance', () => {
  it('renders planting window and succession guidance for the active plan', async () => {
    render(
      <MemoryRouter>
        <PlannerSeasonPanel referenceMonth={4} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: /Seasonality cues/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Plant Kale now')).toBeInTheDocument();
    expect(screen.getByText('Hold Basil for warmer weather')).toBeInTheDocument();
    expect(screen.getByText('Succession sow Kale')).toBeInTheDocument();
    expect(
      screen.getByText(/Kale · Lacinato can be re-sown every 21 days/i),
    ).toBeInTheDocument();
  });
});
