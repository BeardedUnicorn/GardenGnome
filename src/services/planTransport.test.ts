import { describe, expect, it } from 'vitest';

import type {
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import {
  parsePlannerDocumentBundle,
  parsePlannerDocument,
  serializePlannerDocument,
} from '@/services/planTransport';

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

const document: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 24,
    heightCells: 16,
    cellSizeMm: 305,
    seasonTag: '2026',
    seasonFamilyId: 'plan-family-1',
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
      name: 'Bed A',
      notes: '',
      gridX: 2,
      gridY: 3,
      widthCells: 4,
      heightCells: 6,
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
      plantDefinitionId: 'plant-1',
      zoneId: 'zone-1',
      notes: '',
      gridX: 2,
      gridY: 3,
      footprintWidthCells: 2,
      footprintHeightCells: 2,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
};

const plantDefinitions: PlantDefinition[] = [
  withCompatibility({
    id: 'plant-1',
    commonName: 'Custom Basil',
    varietyName: 'Lettuce Leaf',
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
    notes: 'Imported custom crop.',
    isFavorite: false,
    isCustom: true,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  }, {
    companionPlantNames: ['Tomato'],
    preferredZoneTypes: ['raisedBed', 'container'],
  }),
  withCompatibility({
    id: 'plant-unused',
    commonName: 'Unused Dill',
    varietyName: '',
    plantFamily: 'Apiaceae',
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
    successionIntervalDays: null,
    notes: '',
    isFavorite: false,
    isCustom: true,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  }, {
    conflictPlantNames: ['Carrot'],
    preferredZoneTypes: ['raisedBed'],
  }),
];

const journalEntries: GardenJournalEntry[] = [
  {
    id: 'journal-1',
    gardenPlanId: 'plan-1',
    title: 'Spring note',
    body: 'The basil held through the cold snap.',
    observedOn: '2026-04-12',
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
];

const seasonalTasks: SeasonalTask[] = [
  {
    id: 'seasonal-task-plan-1-plant-1-window-open',
    gardenPlanId: 'plan-1',
    plantDefinitionId: 'plant-1',
    placementId: null,
    sourceKey: 'plant-1-window-open',
    kind: 'plant',
    status: 'pending',
    dueMonth: 5,
    title: 'Plant Custom Basil now',
    note: 'Custom Basil · Lettuce Leaf is in its May planting window.',
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
];

describe('planTransport schema helpers', () => {
  it('serializes a planner document into a versioned export envelope', () => {
    const serialized = serializePlannerDocument(
      document,
      plantDefinitions,
      journalEntries,
      seasonalTasks,
    );
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      app: 'GardenGnome',
      kind: 'plannerDocument',
      version: 1,
      document,
      plantDefinitions: [plantDefinitions[0]],
      journalEntries,
      seasonalTasks,
    });
    expect(
      (
        parsed.plantDefinitions as Array<{
          companionPlantNames?: string[];
          preferredZoneTypes?: string[];
        }>
      )[0],
    ).toMatchObject({
      companionPlantNames: ['Tomato'],
      preferredZoneTypes: ['raisedBed', 'container'],
    });
    expect(parsed.exportedAt).toEqual(expect.any(String));
  });

  it('round-trips a valid planner document from the current export envelope', () => {
    const serialized = serializePlannerDocument(
      document,
      plantDefinitions,
      journalEntries,
      seasonalTasks,
    );
    const parsed = parsePlannerDocument(serialized);

    expect(parsed).toEqual(document);
  });

  it('returns bundled plant definitions and journal entries for current export envelopes', () => {
    const serialized = serializePlannerDocument(
      document,
      plantDefinitions,
      journalEntries,
      seasonalTasks,
    );

    expect(parsePlannerDocumentBundle(serialized)).toEqual({
      document,
      plantDefinitions: [plantDefinitions[0]],
      journalEntries,
      seasonalTasks,
    });
  });

  it('backfills empty compatibility metadata for older export envelopes', () => {
    const legacyEnvelope = JSON.stringify({
      app: 'GardenGnome',
      kind: 'plannerDocument',
      version: 1,
      exportedAt: '2026-04-13T00:00:00.000Z',
      document,
      plantDefinitions: [
        {
          ...plantDefinitions[0],
          companionPlantNames: undefined,
          conflictPlantNames: undefined,
          preferredZoneTypes: undefined,
        },
      ],
      journalEntries,
      seasonalTasks,
    });

    const bundle = parsePlannerDocumentBundle(legacyEnvelope);

    expect(
      (
        bundle.plantDefinitions[0] as PlantDefinition & {
          companionPlantNames?: string[];
          conflictPlantNames?: string[];
          preferredZoneTypes?: string[];
        }
      ),
    ).toMatchObject({
      companionPlantNames: [],
      conflictPlantNames: [],
      preferredZoneTypes: [],
    });
  });

  it('rejects invalid planner document data with a useful error', () => {
    const invalid = JSON.stringify({
      ...document,
      plan: {
        ...document.plan,
        measurementSystem: 'unknown',
      },
    });

    expect(() => parsePlannerDocument(invalid)).toThrow(
      /not a valid GardenGnome plan document/i,
    );
  });

  it('rejects malformed JSON payloads', () => {
    expect(() => parsePlannerDocument('{')).toThrow(/valid JSON file/i);
  });

  it('backfills lineage defaults for older planner documents', () => {
    const legacy = JSON.stringify({
      zones: [],
      placements: [],
      plan: {
        ...document.plan,
        id: 'plan-legacy',
        name: 'Legacy Garden',
        seasonTag: '2025',
        seasonFamilyId: undefined,
        sourcePlanId: undefined,
        createdAt: '2025-04-12T00:00:00.000Z',
        updatedAt: '2025-04-12T00:00:00.000Z',
      },
    });

    expect(parsePlannerDocument(legacy).plan).toMatchObject({
      id: 'plan-legacy',
      seasonFamilyId: 'plan-legacy',
      sourcePlanId: null,
    });
  });

  it('backfills sun profile defaults for older planner documents', () => {
    const legacy = JSON.stringify({
      ...document,
      plan: {
        ...document.plan,
        sunProfile: undefined,
      },
    });

    expect(parsePlannerDocument(legacy).plan).toMatchObject({
      sunProfile: {
        shadeEdge: 'north',
        shadeDepthCells: 2,
        partShadeDepthCells: 4,
      },
    });
  });

  it('defaults journal entries to an empty list for older export envelopes', () => {
    const legacyEnvelope = JSON.stringify({
      app: 'GardenGnome',
      kind: 'plannerDocument',
      version: 1,
      exportedAt: '2026-04-13T00:00:00.000Z',
      document,
      plantDefinitions: [plantDefinitions[0]],
    });

    expect(parsePlannerDocumentBundle(legacyEnvelope)).toEqual({
      document,
      plantDefinitions: [plantDefinitions[0]],
      journalEntries: [],
      seasonalTasks: [],
    });
  });

  it('rejects unsupported export envelope versions', () => {
    const unsupported = JSON.stringify({
      app: 'GardenGnome',
      kind: 'plannerDocument',
      version: 99,
      exportedAt: '2026-04-13T00:00:00.000Z',
      document,
    });

    expect(() => parsePlannerDocument(unsupported)).toThrow(
      /unsupported GardenGnome export version/i,
    );
  });
});
