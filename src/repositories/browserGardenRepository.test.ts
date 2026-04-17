import { beforeEach, describe, expect, it } from 'vitest';

import type {
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { BrowserGardenRepository } from '@/repositories/browserGardenRepository';

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

const samplePlan: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'East yard',
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
  zones: [],
  placements: [],
};

const samplePlant: PlantDefinition = withCompatibility({
  id: 'plant-1',
  commonName: 'Basil',
  varietyName: 'Genovese',
  category: 'herb',
  lifecycle: 'annual',
  spacingMm: 203,
  spreadMm: 203,
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
}, {
  companionPlantNames: ['Tomato'],
  preferredZoneTypes: ['raisedBed', 'container'],
});

const secondPlant: PlantDefinition = withCompatibility({
  id: 'plant-2',
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
}, {
  companionPlantNames: ['Basil', 'Marigold'],
  conflictPlantNames: ['Corn'],
  preferredZoneTypes: ['raisedBed', 'inGroundBed', 'trellis'],
});

const sampleJournalEntry: GardenJournalEntry = {
  id: 'journal-1',
  gardenPlanId: 'plan-1',
  title: 'First sprouts',
  body: 'Basil cotyledons opened after three days.',
  observedOn: '2026-04-15',
  createdAt: '2026-04-15T08:00:00.000Z',
  updatedAt: '2026-04-15T08:00:00.000Z',
};

const sampleSeasonalTask: SeasonalTask = {
  id: 'seasonal-task-plan-1-plant-1-window-open',
  gardenPlanId: 'plan-1',
  plantDefinitionId: 'plant-1',
  placementId: null,
  sourceKey: 'plant-1-window-open',
  kind: 'plant',
  status: 'pending',
  dueMonth: 5,
  title: 'Plant Basil now',
  note: 'Basil · Genovese is in its May planting window.',
  createdAt: '2026-04-15T08:00:00.000Z',
  updatedAt: '2026-04-15T08:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
});

describe('BrowserGardenRepository', () => {
  it('persists and reloads planner documents and plant definitions', async () => {
    const repository = new BrowserGardenRepository();

    await repository.saveSettings({
      measurementSystem: 'imperial',
      defaultCellSizeMm: 305,
      theme: 'garden-day',
      autosaveEnabled: true,
      autosaveIntervalSeconds: 2,
      showGrid: true,
      updatedAt: '2026-04-12T00:00:00.000Z',
    });
    await repository.savePlantDefinitions([samplePlant]);
    await repository.savePlanDocument(samplePlan);
    await repository.saveSeasonalTask(sampleSeasonalTask);

    const planSummaries = await repository.listPlans();
    const reloadedPlan = await repository.getPlanDocument('plan-1');
    const plants = await repository.listPlantDefinitions();
    const seasonalTasks = await repository.listSeasonalTasks('plan-1');

    expect(planSummaries).toHaveLength(1);
    expect(planSummaries[0]?.name).toBe('Kitchen Garden');
    expect(reloadedPlan?.plan.name).toBe('Kitchen Garden');
    expect(plants[0]?.commonName).toBe('Basil');
    expect(plants[0]?.plantFamily).toBe('Lamiaceae');
    expect(plants[0]?.plantingWindowStartMonth).toBe(5);
    expect(plants[0]?.successionIntervalDays).toBe(21);
    expect(seasonalTasks).toEqual([sampleSeasonalTask]);
    expect((plants[0] as PlantDefinition & { companionPlantNames?: string[] })?.companionPlantNames)
      .toEqual(['Tomato']);
    expect((plants[0] as PlantDefinition & { preferredZoneTypes?: string[] })?.preferredZoneTypes)
      .toEqual(['raisedBed', 'container']);
  });

  it('backfills empty compatibility metadata for legacy plant rows', async () => {
    localStorage.setItem(
      'garden-gnome:plants',
      JSON.stringify([
        {
          ...samplePlant,
          companionPlantNames: undefined,
          conflictPlantNames: undefined,
          preferredZoneTypes: undefined,
        },
      ]),
    );

    const repository = new BrowserGardenRepository();
    const plants = await repository.listPlantDefinitions();

    expect((plants[0] as PlantDefinition & { companionPlantNames?: string[] })?.companionPlantNames)
      .toEqual([]);
    expect((plants[0] as PlantDefinition & { conflictPlantNames?: string[] })?.conflictPlantNames)
      .toEqual([]);
    expect((plants[0] as PlantDefinition & { preferredZoneTypes?: string[] })?.preferredZoneTypes)
      .toEqual([]);
  });

  it('duplicates an existing planner document with a new id', async () => {
    const repository = new BrowserGardenRepository();

    await repository.savePlanDocument({
      ...samplePlan,
      zones: [
        {
          id: 'zone-1',
          gardenPlanId: 'plan-1',
          type: 'raisedBed',
          shape: 'rectangle',
          name: 'Bed A',
          notes: '',
          gridX: 1,
          gridY: 2,
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
      ],
    });

    const duplicated = await repository.duplicatePlan('plan-1', 'plan-2', {
      seasonTag: '2027',
      name: 'Kitchen Garden 2027',
    });

    expect(duplicated.plan.id).toBe('plan-2');
    expect(duplicated.plan.name).toBe('Kitchen Garden 2027');
    expect(duplicated.plan.seasonTag).toBe('2027');
    expect(duplicated.plan.seasonFamilyId).toBe('family-1');
    expect(duplicated.plan.sourcePlanId).toBe('plan-1');
    expect(duplicated.zones[0]?.gardenPlanId).toBe('plan-2');
    expect(duplicated.placements[0]?.gardenPlanId).toBe('plan-2');
    expect(duplicated.placements[0]?.zoneId).toBe(duplicated.zones[0]?.id);
    expect((await repository.listPlans())).toHaveLength(2);
    expect(await repository.listSeasonalTasks('plan-2')).toEqual([]);
  });

  it('backfills a default sun profile when loading legacy plans', async () => {
    localStorage.setItem(
      'garden-gnome:plans',
      JSON.stringify([
        {
          plan: {
            id: 'legacy-plan',
            name: 'Legacy Garden',
            locationLabel: 'North fence',
            notes: '',
            measurementSystem: 'imperial',
            widthCells: 18,
            heightCells: 12,
            cellSizeMm: 305,
            seasonTag: '2025',
            seasonFamilyId: null,
            sourcePlanId: null,
            createdAt: '2025-04-12T00:00:00.000Z',
            updatedAt: '2025-04-12T00:00:00.000Z',
          },
          zones: [],
          placements: [],
        },
      ]),
    );

    const repository = new BrowserGardenRepository();
    const reloadedPlan = await repository.getPlanDocument('legacy-plan');

    expect(reloadedPlan?.plan).toMatchObject({
      sunProfile: {
        shadeEdge: 'north',
        shadeDepthCells: 2,
        partShadeDepthCells: 4,
      },
    });
  });

  it('removes persisted placements that reference deleted plant definitions', async () => {
    const repository = new BrowserGardenRepository();

    await repository.savePlantDefinitions([samplePlant, secondPlant]);
    await repository.savePlanDocument({
      ...samplePlan,
      placements: [
        {
          id: 'placement-1',
          gardenPlanId: 'plan-1',
          plantDefinitionId: 'plant-1',
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
      ],
    });
    await repository.savePlanDocument({
      ...samplePlan,
      plan: {
        ...samplePlan.plan,
        id: 'plan-2',
        name: 'Patio Garden',
      },
      placements: [
        {
          id: 'placement-2',
          gardenPlanId: 'plan-2',
          plantDefinitionId: 'plant-2',
          zoneId: null,
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
      ],
    });

    await repository.savePlantDefinitions([secondPlant]);

    expect((await repository.getPlanDocument('plan-1'))?.placements).toEqual([]);
    expect((await repository.getPlanDocument('plan-2'))?.placements).toHaveLength(1);
  });

  it('persists plan journal entries and removes them when a plan is deleted', async () => {
    const repository = new BrowserGardenRepository();

    await repository.savePlanDocument(samplePlan);
    await repository.savePlanDocument({
      ...samplePlan,
      plan: {
        ...samplePlan.plan,
        id: 'plan-2',
        name: 'Patio Garden',
      },
    });
    await repository.saveJournalEntry(sampleJournalEntry);
    await repository.saveJournalEntry({
      ...sampleJournalEntry,
      id: 'journal-2',
      gardenPlanId: 'plan-2',
      title: 'Container watered',
    });

    expect(await repository.listJournalEntries('plan-1')).toEqual([sampleJournalEntry]);

    await repository.deletePlan('plan-1');

    expect(await repository.listJournalEntries('plan-1')).toEqual([]);
    expect(await repository.listJournalEntries('plan-2')).toHaveLength(1);
  });

  it('removes seasonal tasks when a plan is deleted', async () => {
    const repository = new BrowserGardenRepository();

    await repository.savePlanDocument(samplePlan);
    await repository.saveSeasonalTask(sampleSeasonalTask);

    expect(await repository.listSeasonalTasks('plan-1')).toEqual([sampleSeasonalTask]);

    await repository.deletePlan('plan-1');

    expect(await repository.listSeasonalTasks('plan-1')).toEqual([]);
  });
});
