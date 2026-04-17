import { describe, expect, it } from 'vitest';

import type {
  GardenJournalEntry,
  GardenPlanSummary,
  PlannerDocument,
  SeasonalTask,
  ValidationIssue,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { serializePlannerSeasonPacket } from '@/services/plannerSeasonPacket';

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
    name: 'Kitchen Garden 2027',
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
    name: 'Kitchen Garden 2028',
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
];

const comparisonDocument: PlannerDocument = {
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

const plannerDocument: PlannerDocument = {
  plan: {
    id: 'plan-2',
    name: 'Kitchen Garden 2027',
    locationLabel: 'Home',
    notes: 'Transitioning the north bed into more leafy crops.',
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

const validationIssues: ValidationIssue[] = [
  {
    code: 'zone-overlap',
    severity: 'warning',
    message: 'East Bed overlaps an access path preview.',
    entityIds: ['zone-4'],
  },
];

const journalEntries: GardenJournalEntry[] = [
  {
    id: 'journal-1',
    gardenPlanId: 'plan-2',
    title: 'Mulch update',
    body: 'Leaf mold held moisture better than expected.',
    observedOn: '2027-04-20',
    createdAt: '2027-04-20T00:00:00.000Z',
    updatedAt: '2027-04-20T00:00:00.000Z',
  },
];

const seasonalTasks: SeasonalTask[] = [
  {
    id: 'seasonal-task-1',
    gardenPlanId: 'plan-2',
    plantDefinitionId: 'plant-kale',
    placementId: null,
    sourceKey: null,
    kind: 'task',
    status: 'pending',
    dueMonth: 4,
    title: 'Thin the kale row',
    note: 'Leave the strongest starts before the next warm week.',
    createdAt: '2027-04-12T00:00:00.000Z',
    updatedAt: '2027-04-12T00:00:00.000Z',
  },
];

describe('plannerSeasonPacket', () => {
  it('serializes a season packet with family context, comparisons, warnings, notes, and tasks', () => {
    const html = serializePlannerSeasonPacket({
      plannerDocument,
      planSummaries,
      comparisonDocument,
      plantDefinitions,
      validationIssues,
      journalEntries,
      seasonalTasks,
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Season Share Packet');
    expect(html).toContain('Kitchen Garden');
    expect(html).toContain('2026');
    expect(html).toContain('2027');
    expect(html).toContain('2028');
    expect(html).toContain('Rotate repeated families');
    expect(html).toContain('Added zone this season: East Bed.');
    expect(html).toContain('Basil · Genovese moved from North Bed to East Bed.');
    expect(html).toContain('East Bed overlaps an access path preview.');
    expect(html).toContain('Mulch update');
    expect(html).toContain('Thin the kale row');
  });

  it('falls back to a current-season packet when no comparison document is available', () => {
    const html = serializePlannerSeasonPacket({
      plannerDocument,
      planSummaries: [planSummaries[1]!],
      comparisonDocument: null,
      plantDefinitions,
      validationIssues: [],
      journalEntries: [],
      seasonalTasks: [],
    });

    expect(html).toContain('Season Share Packet');
    expect(html).toContain('No comparison snapshot is attached to this packet yet.');
    expect(html).not.toContain('Rotate repeated families');
  });
});
