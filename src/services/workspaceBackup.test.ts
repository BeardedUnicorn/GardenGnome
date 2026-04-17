import { describe, expect, it } from 'vitest';

import type {
  AppSettings,
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import {
  parseWorkspaceBackupBundle,
  serializeWorkspaceBackup,
} from '@/services/workspaceBackup';

const settings: AppSettings = {
  measurementSystem: 'imperial',
  defaultCellSizeMm: 305,
  theme: 'garden-day',
  autosaveEnabled: true,
  autosaveIntervalSeconds: 2,
  showGrid: true,
  updatedAt: '2026-04-14T00:00:00.000Z',
};

const plantDefinition: PlantDefinition = {
  id: 'plant-1',
  commonName: 'Tomato',
  varietyName: 'Sun Gold',
  plantFamily: 'Solanaceae',
  category: 'fruiting',
  lifecycle: 'annual',
  spacingMm: 457,
  spreadMm: 610,
  heightMm: 1829,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 65,
  plantingWindowStartMonth: 4,
  plantingWindowEndMonth: 6,
  successionIntervalDays: null,
  companionPlantNames: ['Basil'],
  conflictPlantNames: [],
  preferredZoneTypes: ['raisedBed', 'greenhouseZone'],
  notes: 'Sweet cherry tomato.',
  isFavorite: true,
  isCustom: true,
  createdAt: '2026-04-14T00:00:00.000Z',
  updatedAt: '2026-04-14T00:00:00.000Z',
};

const document: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'Back fence',
    notes: 'Warmest space.',
    measurementSystem: 'imperial',
    widthCells: 16,
    heightCells: 10,
    cellSizeMm: 305,
    seasonTag: '2026',
    seasonFamilyId: 'season-family-1',
    sourcePlanId: null,
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    sunProfile: {
      shadeEdge: 'north',
      shadeDepthCells: 1,
      partShadeDepthCells: 2,
    },
  },
  zones: [
    {
      id: 'zone-1',
      gardenPlanId: 'plan-1',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'North Bed',
      notes: 'Main summer crop bed.',
      gridX: 1,
      gridY: 1,
      widthCells: 4,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    },
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-1',
      zoneId: 'zone-1',
      notes: 'String up after transplanting.',
      gridX: 1,
      gridY: 1,
      footprintWidthCells: 1,
      footprintHeightCells: 1,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
    },
  ],
};

const journalEntry: GardenJournalEntry = {
  id: 'journal-1',
  gardenPlanId: 'plan-1',
  title: 'Cold snap',
  body: 'Covered the bed overnight.',
  observedOn: '2026-04-13',
  createdAt: '2026-04-14T00:00:00.000Z',
  updatedAt: '2026-04-14T00:00:00.000Z',
};

const seasonalTask: SeasonalTask = {
  id: 'task-1',
  gardenPlanId: 'plan-1',
  plantDefinitionId: 'plant-1',
  placementId: 'placement-1',
  sourceKey: 'plant-1-window-open',
  kind: 'plant',
  status: 'pending',
  dueMonth: 4,
  title: 'Plant Tomato now',
  note: 'Tomato is ready for transplanting.',
  createdAt: '2026-04-14T00:00:00.000Z',
  updatedAt: '2026-04-14T00:00:00.000Z',
};

describe('workspaceBackup', () => {
  it('serializes a full workspace backup envelope and round-trips it', () => {
    const serialized = serializeWorkspaceBackup({
      settings,
      plantDefinitions: [plantDefinition],
      documents: [document],
      journalEntries: [journalEntry],
      seasonalTasks: [seasonalTask],
    });

    const parsed = parseWorkspaceBackupBundle(serialized);

    expect(parsed.exportedAt).toEqual(expect.any(String));
    expect(parsed.settings).toEqual(settings);
    expect(parsed.plantDefinitions).toEqual([plantDefinition]);
    expect(parsed.documents).toEqual([document]);
    expect(parsed.journalEntries).toEqual([journalEntry]);
    expect(parsed.seasonalTasks).toEqual([seasonalTask]);
  });

  it('rejects unsupported workspace backup versions', () => {
    expect(() =>
      parseWorkspaceBackupBundle(
        JSON.stringify({
          app: 'GardenGnome',
          kind: 'workspaceBackup',
          version: 99,
          exportedAt: '2026-04-14T00:00:00.000Z',
          settings,
          plantDefinitions: [plantDefinition],
          documents: [document],
          journalEntries: [journalEntry],
          seasonalTasks: [seasonalTask],
        }),
      ),
    ).toThrow(/unsupported GardenGnome workspace backup version/i);
  });
});
