import { describe, expect, it } from 'vitest';

import type {
  GardenPlanSummary,
  PlannerDocument,
} from '@/domain/garden/models';
import * as rotationHelpers from '@/domain/garden/rotation';
import {
  buildRotationGuidance,
  buildRotationSnapshot,
  getSeasonFamilyContext,
  listSeasonFamilies,
} from '@/domain/garden/rotation';
import type { PlantDefinition } from '@/domain/plants/models';

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
    name: 'Kitchen Garden Spring Layout',
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
  {
    id: 'plan-3',
    name: 'Kitchen Garden Summer Layout',
    locationLabel: 'Home',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2028',
    seasonFamilyId: 'family-1',
    sourcePlanId: 'plan-2',
    updatedAt: '2028-04-12T00:00:00.000Z',
  },
  {
    id: 'plan-4',
    name: 'Kitchen Garden 2027',
    locationLabel: 'Community Plot',
    measurementSystem: 'imperial',
    widthCells: 20,
    heightCells: 12,
    cellSizeMm: 305,
    seasonTag: '2027',
    seasonFamilyId: 'family-2',
    sourcePlanId: null,
    updatedAt: '2027-04-12T00:00:00.000Z',
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
    seasonFamilyId: 'family-1',
    sourcePlanId: null,
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

const currentDocument: PlannerDocument = {
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

describe('season rotation helpers', () => {
  it('groups plans into a season family with previous and next seasons', () => {
    expect(getSeasonFamilyContext(planSummaries, 'plan-2')).toMatchObject({
      familyName: 'Kitchen Garden',
      previous: { id: 'plan-1' },
      next: { id: 'plan-3' },
    });
  });

  it('builds dashboard season families ordered by latest saved season', () => {
    expect(listSeasonFamilies(planSummaries)).toMatchObject([
      {
        familyName: 'Kitchen Garden',
        latest: { id: 'plan-3' },
        seasons: [{ id: 'plan-1' }, { id: 'plan-2' }, { id: 'plan-3' }],
      },
      {
        familyName: 'Kitchen Garden',
        latest: { id: 'plan-4' },
        seasons: [{ id: 'plan-4' }],
      },
    ]);
  });

  it('builds a crop rotation snapshot between seasons', () => {
    expect(
      buildRotationSnapshot(currentDocument, previousDocument, plantDefinitions),
    ).toEqual({
      repeatedCrops: ['Basil · Genovese'],
      repeatedFamilies: ['Lamiaceae'],
      addedCrops: ['Kale · Lacinato'],
      retiredCrops: ['Tomato · Sun Gold'],
    });
  });

  it('builds actionable rotation guidance from repeated crops and families', () => {
    const snapshot = buildRotationSnapshot(
      currentDocument,
      previousDocument,
      plantDefinitions,
    );

    expect(buildRotationGuidance(snapshot)).toEqual([
      {
        key: 'repeat-family',
        title: 'Rotate repeated families',
        note: 'Lamiaceae repeats from the previous saved season. Move that family to a different bed or give this area a rest next season.',
      },
      {
        key: 'repeat-crop',
        title: 'Avoid direct repeats',
        note: 'Basil · Genovese repeats from the previous saved season. Replanting the same crop in place can compound pest and disease pressure.',
      },
    ]);
  });

  it('builds zone and crop deltas between two saved seasons in the same family', () => {
    const comparison = rotationHelpers.buildSeasonPlanComparison?.(
      currentDocument,
      previousDocument,
      plantDefinitions,
    );

    expect(comparison).toMatchObject({
      zoneChanges: expect.arrayContaining([
        expect.objectContaining({
          zoneName: 'East Bed',
          status: 'added',
          note: expect.stringContaining('Added zone this season'),
          addedCrops: ['Basil · Genovese'],
        }),
        expect.objectContaining({
          zoneName: 'North Bed',
          status: 'changed',
          note: expect.stringContaining('Footprint changed from 4 × 2 cells to 5 × 2 cells'),
          addedCrops: ['Kale · Lacinato'],
          removedCrops: ['Basil · Genovese'],
        }),
        expect.objectContaining({
          zoneName: 'South Bed',
          status: 'removed',
          note: expect.stringContaining('Removed zone from this season'),
          removedCrops: ['Tomato · Sun Gold'],
        }),
      ]),
      cropChanges: expect.arrayContaining([
        expect.objectContaining({
          cropLabel: 'Basil · Genovese',
          currentPlantDefinitionId: 'plant-basil',
          status: 'moved',
          note: expect.stringContaining('moved from North Bed to East Bed'),
        }),
        expect.objectContaining({
          cropLabel: 'Kale · Lacinato',
          currentPlantDefinitionId: 'plant-kale',
          status: 'added',
          note: expect.stringContaining('Added Kale · Lacinato in North Bed'),
        }),
        expect.objectContaining({
          cropLabel: 'Tomato · Sun Gold',
          currentPlantDefinitionId: null,
          status: 'removed',
          note: expect.stringContaining('Removed Tomato · Sun Gold from South Bed'),
        }),
      ]),
    });
  });
});
