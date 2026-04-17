import { describe, expect, it } from 'vitest';

import type {
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
  ValidationIssue,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { serializePrintablePlannerDocument } from '@/services/plannerPrint';

const document: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'Home',
    notes: 'South fence layout',
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
    {
      id: 'zone-2',
      gardenPlanId: 'plan-1',
      type: 'container',
      shape: 'circle',
      name: 'Patio Pot',
      notes: '',
      gridX: 10,
      gridY: 4,
      widthCells: 2,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'container',
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
    {
      id: 'placement-2',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-2',
      zoneId: 'zone-2',
      notes: '',
      gridX: 10,
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

const plantDefinitions: PlantDefinition[] = [
  {
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
  },
  {
    id: 'plant-2',
    commonName: 'Tomato',
    varietyName: 'Sun Gold',
    plantFamily: 'Solanaceae',
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
    isFavorite: true,
    isCustom: false,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  {
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
  },
];

const validationIssues: ValidationIssue[] = [
  {
    code: 'zone-overlap',
    severity: 'warning',
    message: 'Bed A overlaps Patio Pot.',
    entityIds: ['zone-1', 'zone-2'],
  },
];

const journalEntries: GardenJournalEntry[] = [
  {
    id: 'journal-1',
    gardenPlanId: 'plan-1',
    title: 'Frost watch',
    body: 'Cover the basil if temperatures dip below 40F again.',
    observedOn: '2026-04-13',
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
  },
];

const seasonalTasks: SeasonalTask[] = [
  {
    id: 'seasonal-task-1',
    gardenPlanId: 'plan-1',
    plantDefinitionId: 'plant-1',
    placementId: null,
    sourceKey: null,
    kind: 'task',
    status: 'done',
    dueMonth: 6,
    title: 'Mulch the basil bed',
    note: 'Top up compost before the next hot stretch.',
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
  },
];

describe('plannerPrint', () => {
  it('serializes a printable planner sheet with layout, summaries, warnings, and journal notes', () => {
    const html = serializePrintablePlannerDocument(
      document,
      plantDefinitions,
      validationIssues,
      journalEntries,
      seasonalTasks,
    );

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Kitchen Garden');
    expect(html).toContain('South fence layout');
    expect(html).toContain('Bed A');
    expect(html).toContain('Patio Pot');
    expect(html).toContain('Custom Basil');
    expect(html).toContain('Tomato');
    expect(html).toContain('Bed A overlaps Patio Pot.');
    expect(html).toContain('Frost watch');
    expect(html).toContain('Cover the basil if temperatures dip below 40F again.');
    expect(html).toContain('Season tasks');
    expect(html).toContain('Mulch the basil bed');
    expect(html).toContain('Top up compost before the next hot stretch.');
    expect(html).toContain('<svg');
    expect(html).toContain('Prepared in GardenGnome');
  });

  it('only includes placed crops in the printable crop list', () => {
    const html = serializePrintablePlannerDocument(document, plantDefinitions, []);

    expect(html).toContain('Custom Basil');
    expect(html).toContain('Tomato');
    expect(html).not.toContain('Unused Dill');
  });
});
