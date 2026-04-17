import { describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { buildSeasonalityGuidance } from '@/domain/garden/seasonalityGuidance';

const basil: PlantDefinition = {
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
};

const kale: PlantDefinition = {
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
};

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
      id: 'placement-basil',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-basil',
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
    {
      id: 'placement-kale',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-kale',
      zoneId: null,
      notes: '',
      gridX: 3,
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

describe('buildSeasonalityGuidance', () => {
  it('surfaces crops that are ready to plant during the reference month', () => {
    const guidance = buildSeasonalityGuidance(
      plannerDocument,
      [basil, kale, tomato],
      4,
    );

    expect(guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plantDefinitionId: 'plant-kale',
          status: 'inWindow',
          title: 'Plant Kale now',
          note: expect.stringMatching(/Kale · Lacinato/i),
        }),
        expect.objectContaining({
          plantDefinitionId: 'plant-tomato',
          status: 'inWindow',
          title: 'Plant Tomato now',
          note: expect.stringMatching(/April planting window/i),
        }),
      ]),
    );
  });

  it('flags placed crops that fall outside the reference month planting window', () => {
    const guidance = buildSeasonalityGuidance(
      plannerDocument,
      [basil, kale, tomato],
      4,
    );

    expect(guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plantDefinitionId: 'plant-basil',
          status: 'outOfWindow',
          title: 'Hold Basil for warmer weather',
          note: 'Basil · Genovese usually starts in May-Aug, not April.',
        }),
      ]),
    );
  });

  it('suggests succession sowing only for crops that are active in the current window', () => {
    const guidance = buildSeasonalityGuidance(
      plannerDocument,
      [basil, kale, tomato],
      4,
    );

    expect(guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plantDefinitionId: 'plant-kale',
          status: 'succession',
          title: 'Succession sow Kale',
          note: 'Kale · Lacinato can be re-sown every 21 days while the planting window stays open.',
        }),
      ]),
    );
    expect(guidance).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'succession',
          title: 'Succession sow Basil',
        }),
      ]),
    );
  });

  it('surfaces estimated harvest cues for placed crops with maturity metadata', () => {
    const guidance = buildSeasonalityGuidance(
      plannerDocument,
      [basil, kale, tomato],
      4,
    );

    expect(guidance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plantDefinitionId: 'plant-tomato',
          status: 'harvest',
          title: 'Harvest Tomato in June',
          note: expect.stringContaining('65 days'),
        }),
      ]),
    );
  });
});
