import { describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { buildGeneratedSeasonalTasks } from '@/domain/garden/seasonalTasks';

const tomato: PlantDefinition = {
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
  companionPlantNames: [],
  conflictPlantNames: [],
  preferredZoneTypes: ['raisedBed'],
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

const plannerDocument: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
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
  placements: [
    {
      id: 'placement-tomato',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-tomato',
      zoneId: null,
      notes: '',
      gridX: 5,
      gridY: 2,
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

describe('buildGeneratedSeasonalTasks', () => {
  it('adds an estimated harvest task for placed crops with maturity metadata', () => {
    const tasks = buildGeneratedSeasonalTasks(plannerDocument, [tomato], 4);

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plantDefinitionId: 'plant-tomato',
          placementId: null,
          sourceKey: 'plant-tomato-harvest',
          kind: 'harvest',
          dueMonth: 6,
          title: 'Harvest Tomato in June',
          note: expect.stringContaining('65 days'),
        }),
      ]),
    );
  });
});
