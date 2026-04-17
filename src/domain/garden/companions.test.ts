import { describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { buildCompanionSuggestions } from '@/domain/garden/companions';

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
    preferredZoneTypes: ['raisedBed', 'inGroundBed', 'container'],
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
    plantingWindowStartMonth: 4,
    plantingWindowEndMonth: 6,
    successionIntervalDays: null,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  }, {
    companionPlantNames: ['Basil', 'Marigold'],
    preferredZoneTypes: ['raisedBed', 'inGroundBed', 'trellis'],
  }),
  withCompatibility({
    id: 'plant-marigold',
    commonName: 'Marigold',
    varietyName: 'Gem',
    category: 'flower',
    lifecycle: 'annual',
    spacingMm: 203,
    spreadMm: 203,
    heightMm: 305,
    sunRequirement: 'fullSun',
    waterRequirement: 'low',
    daysToMaturity: 55,
    plantingWindowStartMonth: 4,
    plantingWindowEndMonth: 6,
    successionIntervalDays: null,
    notes: '',
    isFavorite: false,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  }, {
    companionPlantNames: ['Tomato'],
    preferredZoneTypes: ['raisedBed', 'inGroundBed', 'container'],
  }),
];

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
    seasonFamilyId: 'family-1',
    sourcePlanId: null,
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
      name: 'Sun Bed',
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
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-basil',
      zoneId: 'zone-1',
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
      id: 'placement-2',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-tomato',
      zoneId: 'zone-1',
      notes: '',
      gridX: 2,
      gridY: 1,
      footprintWidthCells: 2,
      footprintHeightCells: 2,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      id: 'placement-3',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-basil',
      zoneId: 'zone-1',
      notes: '',
      gridX: 4,
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

describe('companion planting suggestions', () => {
  it('builds zone-aware companion suggestions with boundary notes for a compatible bed', () => {
    expect(buildCompanionSuggestions(document, plantDefinitions, 5)).toEqual([
      {
        key: 'basil-tomato:zone:zone-1',
        zoneId: 'zone-1',
        zoneName: 'Sun Bed',
        status: 'paired',
        title: 'Tomato + Basil',
        plants: ['Tomato', 'Basil'],
        missingPlantDefinitionId: null,
        note: 'Tomato and Basil are marked as companion plants in your library.',
        boundaryNotes: [
          'Sun Bed stays mostly full sun.',
          'This zone is running a moderate water profile.',
          'Basil and Tomato already share this growable zone.',
        ],
      },
      {
        key: 'marigold-tomato:zone:zone-1:missing:marigold',
        zoneId: 'zone-1',
        zoneName: 'Sun Bed',
        status: 'suggested',
        title: 'Add Marigold near Tomato',
        plants: ['Tomato', 'Marigold'],
        missingPlantDefinitionId: 'plant-marigold',
        note:
          'Consider adding Marigold near Tomato. Marigold is marked as a companion plant for Tomato in your library.',
        boundaryNotes: [
          'Sun Bed stays mostly full sun.',
          'This zone is running a moderate water profile.',
          'May is inside Marigold planting window.',
        ],
      },
    ]);
  });

  it('only suggests missing companions that are in-window for the reference month', () => {
    expect(
      buildCompanionSuggestions(
        {
          ...document,
          placements: [
            {
              ...document.placements[1]!,
              plantDefinitionId: 'plant-tomato',
            },
          ],
        },
        plantDefinitions,
        1,
      ),
    ).toEqual([]);
  });

  it('suppresses companion guidance in mixed-water zones', () => {
    expect(
      buildCompanionSuggestions(
        {
          ...document,
          placements: [
            {
              ...document.placements[1]!,
              plantDefinitionId: 'plant-tomato',
            },
            {
              ...document.placements[0]!,
              id: 'placement-4',
              plantDefinitionId: 'plant-marigold',
            },
          ],
        },
        plantDefinitions,
        5,
      ),
    ).toEqual([]);
  });
});
