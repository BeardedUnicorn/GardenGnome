import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import * as repositoryFactory from '@/repositories/repositoryFactory';
import { useGardenStore } from '@/stores/gardenStore';

const sourceDocument: PlannerDocument = {
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
    seasonFamilyId: 'plan-1',
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
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-1',
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
  ],
};

const initialState = useGardenStore.getState();
const savePlanDocumentMock = vi.fn();
const savePlantDefinitionsMock = vi.fn();
const saveSettingsMock = vi.fn();
const saveJournalEntryMock = vi.fn();
const saveSeasonalTaskMock = vi.fn();
const deleteSeasonalTaskMock = vi.fn();
const listSeasonalTasksMock = vi.fn();
const listJournalEntriesMock = vi.fn();
const getPlanDocumentMock = vi.fn();
const listPlansMock = vi.fn();
const getGardenRepositorySpy = vi.spyOn(repositoryFactory, 'getGardenRepository');

const importedPlantDefinition: PlantDefinition = {
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
};

const importedJournalEntry: GardenJournalEntry = {
  id: 'journal-1',
  gardenPlanId: 'plan-1',
  title: 'Imported journal note',
  body: 'Needs mulch around the basil.',
  observedOn: '2026-04-12',
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

const importedSeasonalTask: SeasonalTask = {
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
};

beforeEach(() => {
  savePlanDocumentMock.mockReset();
  savePlanDocumentMock.mockResolvedValue(undefined);
  savePlantDefinitionsMock.mockReset();
  savePlantDefinitionsMock.mockResolvedValue(undefined);
  saveSettingsMock.mockReset();
  saveSettingsMock.mockResolvedValue(undefined);
  saveJournalEntryMock.mockReset();
  saveJournalEntryMock.mockResolvedValue(undefined);
  saveSeasonalTaskMock.mockReset();
  saveSeasonalTaskMock.mockResolvedValue(undefined);
  deleteSeasonalTaskMock.mockReset();
  deleteSeasonalTaskMock.mockResolvedValue(undefined);
  listSeasonalTasksMock.mockReset();
  listSeasonalTasksMock.mockResolvedValue([]);
  listJournalEntriesMock.mockReset();
  listJournalEntriesMock.mockResolvedValue([]);
  getPlanDocumentMock.mockReset();
  getPlanDocumentMock.mockResolvedValue(null);
  listPlansMock.mockReset();
  listPlansMock.mockResolvedValue([]);

  getGardenRepositorySpy.mockReturnValue({
    savePlanDocument: savePlanDocumentMock,
    savePlantDefinitions: savePlantDefinitionsMock,
    saveSettings: saveSettingsMock,
    saveJournalEntry: saveJournalEntryMock,
    saveSeasonalTask: saveSeasonalTaskMock,
    deleteSeasonalTask: deleteSeasonalTaskMock,
    getPlanDocument: getPlanDocumentMock,
    listJournalEntries: listJournalEntriesMock,
    listSeasonalTasks: listSeasonalTasksMock,
    listPlans: listPlansMock,
  } as unknown as ReturnType<typeof repositoryFactory.getGardenRepository>);

  act(() => {
    useGardenStore.setState({
      ...initialState,
      planSummaries: [],
      plantDefinitions: [],
      seasonalTasks: [],
    });
  });
});

afterEach(() => {
  getGardenRepositorySpy.mockReset();

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('gardenStore importPlanDocument', () => {
  it('preserves placement zone assignments when imported zone ids are remapped', async () => {
    let importedPlanId = '';

    await act(async () => {
      importedPlanId = await useGardenStore.getState().importPlanDocument(
        sourceDocument,
        [importedPlantDefinition],
      );
    });

    expect(savePlantDefinitionsMock).toHaveBeenCalledTimes(1);
    expect(savePlanDocumentMock).toHaveBeenCalledTimes(1);

    const importedDocument = savePlanDocumentMock.mock.calls[0]?.[0] as PlannerDocument;
    const importedZone = importedDocument.zones[0];
    const importedPlacement = importedDocument.placements[0];

    expect(importedDocument.plan.id).toBe(importedPlanId);
    expect(importedZone?.gardenPlanId).toBe(importedPlanId);
    expect(importedPlacement?.gardenPlanId).toBe(importedPlanId);
    expect(importedPlacement?.zoneId).toBe(importedZone?.id);
    expect(importedPlacement?.zoneId).not.toBe(sourceDocument.placements[0]?.zoneId);
    expect(useGardenStore.getState().plantDefinitions).toEqual([importedPlantDefinition]);
  });

  it('remaps imported journal entries onto the new imported plan', async () => {
    let importedPlanId = '';

    await act(async () => {
      importedPlanId = await useGardenStore.getState().importPlanDocument(
        sourceDocument,
        [importedPlantDefinition],
        [importedJournalEntry],
      );
    });

    expect(saveJournalEntryMock).toHaveBeenCalledTimes(1);

    const savedJournalEntry = saveJournalEntryMock.mock.calls[0]?.[0] as GardenJournalEntry;

    expect(savedJournalEntry.gardenPlanId).toBe(importedPlanId);
    expect(savedJournalEntry.id).not.toBe(importedJournalEntry.id);
    expect(savedJournalEntry.title).toBe(importedJournalEntry.title);
    expect(savedJournalEntry.body).toBe(importedJournalEntry.body);
    expect(savedJournalEntry.observedOn).toBe(importedJournalEntry.observedOn);
  });

  it('remaps imported seasonal tasks onto the new imported plan', async () => {
    let importedPlanId = '';

    await act(async () => {
      importedPlanId = await useGardenStore.getState().importPlanDocument(
        sourceDocument,
        [importedPlantDefinition],
        [importedJournalEntry],
        [importedSeasonalTask],
      );
    });

    expect(saveSeasonalTaskMock).toHaveBeenCalledTimes(1);

    const savedSeasonalTask = saveSeasonalTaskMock.mock.calls[0]?.[0] as SeasonalTask;

    expect(savedSeasonalTask.gardenPlanId).toBe(importedPlanId);
    expect(savedSeasonalTask.id).not.toBe(importedSeasonalTask.id);
    expect(savedSeasonalTask.sourceKey).toBe(importedSeasonalTask.sourceKey);
    expect(savedSeasonalTask.title).toBe(importedSeasonalTask.title);
    expect(savedSeasonalTask.note).toBe(importedSeasonalTask.note);
  });
});

describe('gardenStore restoreWorkspaceBackup', () => {
  it('restores workspace plans with remapped season lineage and placement-linked tasks', async () => {
    const comparisonDocument: PlannerDocument = {
      plan: {
        ...sourceDocument.plan,
        id: 'plan-2',
        name: 'Kitchen Garden Summer',
        seasonTag: '2027',
        seasonFamilyId: 'plan-1',
        sourcePlanId: 'plan-1',
      },
      zones: sourceDocument.zones.map((zone) => ({
        ...zone,
        id: 'zone-2',
        gardenPlanId: 'plan-2',
      })),
      placements: sourceDocument.placements.map((placement) => ({
        ...placement,
        id: 'placement-2',
        gardenPlanId: 'plan-2',
        zoneId: 'zone-2',
      })),
    };

    await act(async () => {
      await (useGardenStore.getState() as never as {
        restoreWorkspaceBackup: (bundle: unknown) => Promise<number>;
      }).restoreWorkspaceBackup({
        exportedAt: '2026-04-14T00:00:00.000Z',
        settings: initialState.settings,
        plantDefinitions: [importedPlantDefinition],
        documents: [sourceDocument, comparisonDocument],
        journalEntries: [importedJournalEntry],
        seasonalTasks: [
          importedSeasonalTask,
          {
            ...importedSeasonalTask,
            id: 'task-2',
            gardenPlanId: 'plan-2',
            placementId: 'placement-2',
            sourceKey: null,
            title: 'Tie in summer tomato',
          },
        ],
      });
    });

    expect(savePlantDefinitionsMock).toHaveBeenCalledTimes(1);
    expect(savePlanDocumentMock).toHaveBeenCalledTimes(2);
    expect(saveJournalEntryMock).toHaveBeenCalledTimes(1);
    expect(saveSeasonalTaskMock).toHaveBeenCalledTimes(2);

    const restoredSpring = savePlanDocumentMock.mock.calls[0]?.[0] as PlannerDocument;
    const restoredSummer = savePlanDocumentMock.mock.calls[1]?.[0] as PlannerDocument;
    const restoredJournal = saveJournalEntryMock.mock.calls[0]?.[0] as GardenJournalEntry;
    const restoredSummerTask = saveSeasonalTaskMock.mock.calls[1]?.[0] as SeasonalTask;

    expect(restoredSpring.plan.id).not.toBe(sourceDocument.plan.id);
    expect(restoredSummer.plan.id).not.toBe(comparisonDocument.plan.id);
    expect(restoredSummer.plan.seasonFamilyId).toBe(restoredSpring.plan.id);
    expect(restoredSummer.plan.sourcePlanId).toBe(restoredSpring.plan.id);
    expect(restoredJournal.gardenPlanId).toBe(restoredSpring.plan.id);
    expect(restoredSummerTask.gardenPlanId).toBe(restoredSummer.plan.id);
    expect(restoredSummerTask.placementId).toBe(restoredSummer.placements[0]?.id);
  });
});

describe('gardenStore createPlan templates', () => {
  it('creates a starter document with seeded zones when a template is selected', async () => {
    let savedDocument: PlannerDocument | null = null;

    savePlanDocumentMock.mockImplementation(async (document: PlannerDocument) => {
      savedDocument = structuredClone(document);
    });
    getPlanDocumentMock.mockImplementation(async () => savedDocument);
    listPlansMock.mockImplementation(async () =>
      savedDocument
        ? [
            {
              id: savedDocument.plan.id,
              name: savedDocument.plan.name,
              locationLabel: savedDocument.plan.locationLabel,
              measurementSystem: savedDocument.plan.measurementSystem,
              widthCells: savedDocument.plan.widthCells,
              heightCells: savedDocument.plan.heightCells,
              cellSizeMm: savedDocument.plan.cellSizeMm,
              seasonTag: savedDocument.plan.seasonTag,
              seasonFamilyId: savedDocument.plan.seasonFamilyId,
              sourcePlanId: savedDocument.plan.sourcePlanId,
              updatedAt: savedDocument.plan.updatedAt,
            },
          ]
        : [],
    );

    let createdPlanId = '';

    await act(async () => {
      createdPlanId = await useGardenStore.getState().createPlan({
        name: 'Raised Bed Starter',
        locationLabel: 'Backyard',
        widthCells: 18,
        heightCells: 12,
        measurementSystem: 'imperial',
        cellSizeMm: 305,
        seasonTag: '2026',
        templateId: 'raised-bed-starter',
      } as never);
    });

    expect(createdPlanId).toEqual(expect.any(String));
    expect(savedDocument).not.toBeNull();

    if (!savedDocument) {
      throw new Error('Expected the starter template document to be saved.');
    }

    const persistedDocument = savedDocument as PlannerDocument;

    expect(persistedDocument.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'raisedBed',
          name: 'North Bed',
        }),
        expect.objectContaining({
          type: 'raisedBed',
          name: 'South Bed',
        }),
        expect.objectContaining({
          type: 'pathway',
        }),
      ]),
    );
    expect(persistedDocument.plan.notes).toMatch(/starter/i);
  });
});

describe('gardenStore deletePlantDefinition', () => {
  it('removes active placements that reference the deleted plant definition', async () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: structuredClone(sourceDocument),
        activePlanId: sourceDocument.plan.id,
        plantDefinitions: [importedPlantDefinition],
      });
    });

    await act(async () => {
      await useGardenStore.getState().deletePlantDefinition(importedPlantDefinition.id);
    });

    expect(savePlantDefinitionsMock).toHaveBeenCalledWith([]);
    expect(useGardenStore.getState().plantDefinitions).toEqual([]);
    expect(useGardenStore.getState().activeDocument?.placements).toEqual([]);
  });
});

describe('gardenStore seasonal tasks', () => {
  it('syncs generated seasonal tasks for the active plan and preserves completion state', async () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: structuredClone(sourceDocument),
        activePlanId: sourceDocument.plan.id,
        plantDefinitions: [importedPlantDefinition],
        seasonalTasks: [
          {
            ...importedSeasonalTask,
            id: 'existing-task',
            gardenPlanId: sourceDocument.plan.id,
            status: 'done',
          },
        ],
      });
    });

    await act(async () => {
      await useGardenStore.getState().syncSeasonalTasks(5);
    });

    expect(saveSeasonalTaskMock).toHaveBeenCalledTimes(2);
    expect(useGardenStore.getState().seasonalTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'existing-task',
          gardenPlanId: sourceDocument.plan.id,
          sourceKey: importedSeasonalTask.sourceKey,
          status: 'done',
          title: 'Plant Custom Basil now',
        }),
        expect.objectContaining({
          kind: 'succession',
          status: 'pending',
          title: 'Succession sow Custom Basil',
        }),
        expect.objectContaining({
          kind: 'harvest',
          status: 'pending',
          dueMonth: 6,
          title: 'Harvest Custom Basil in June',
          note: expect.stringContaining('45 days'),
        }),
      ]),
    );
  });

  it('updates a persisted seasonal task status', async () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: structuredClone(sourceDocument),
        activePlanId: sourceDocument.plan.id,
        seasonalTasks: [
          {
            ...importedSeasonalTask,
            id: 'existing-task',
            gardenPlanId: sourceDocument.plan.id,
            status: 'pending',
          },
        ],
      });
    });

    await act(async () => {
      await useGardenStore.getState().setSeasonalTaskStatus('existing-task', 'done');
    });

    expect(saveSeasonalTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-task',
        status: 'done',
      }),
    );
    expect(useGardenStore.getState().seasonalTasks[0]).toMatchObject({
      id: 'existing-task',
      status: 'done',
    });
  });

  it('creates and persists a manual seasonal task', async () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: structuredClone(sourceDocument),
        activePlanId: sourceDocument.plan.id,
        seasonalTasks: [],
      });
    });

    await act(async () => {
      await useGardenStore.getState().saveSeasonalTask({
        title: 'Mulch the basil bed',
        note: 'Top up compost before the next hot stretch.',
        dueMonth: 6,
        kind: 'task',
        plantDefinitionId: 'plant-1',
      });
    });

    expect(saveSeasonalTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        gardenPlanId: sourceDocument.plan.id,
        sourceKey: null,
        kind: 'task',
        title: 'Mulch the basil bed',
        note: 'Top up compost before the next hot stretch.',
        dueMonth: 6,
        plantDefinitionId: 'plant-1',
        status: 'pending',
      }),
    );
    expect(useGardenStore.getState().seasonalTasks).toEqual([
      expect.objectContaining({
        kind: 'task',
        title: 'Mulch the basil bed',
      }),
    ]);
  });

  it('deletes a persisted manual seasonal task', async () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        activeDocument: structuredClone(sourceDocument),
        activePlanId: sourceDocument.plan.id,
        seasonalTasks: [
          {
            ...importedSeasonalTask,
            id: 'manual-task',
            sourceKey: null,
            kind: 'task',
            title: 'Mulch the basil bed',
          },
        ],
      });
    });

    await act(async () => {
      await useGardenStore.getState().deleteSeasonalTask('manual-task');
    });

    expect(deleteSeasonalTaskMock).toHaveBeenCalledWith('manual-task');
    expect(useGardenStore.getState().seasonalTasks).toEqual([]);
  });
});
