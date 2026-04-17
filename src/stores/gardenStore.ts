import { create } from 'zustand';

import { createDefaultSettings } from '@/domain/garden/defaults';
import {
  createPlacementLayout,
  createPlannerDocument,
  createZone,
  findGrowableZoneId,
  type CreatePlanInput,
  type PlacementLayoutPattern,
} from '@/domain/garden/factories';
import {
  deriveNextSeasonTag,
  formatSeasonDuplicateName,
} from '@/domain/garden/seasons';
import { applyGardenTemplate, type GardenTemplateId } from '@/domain/garden/templates';
import {
  buildGeneratedSeasonalTasks,
  makeSeasonalTaskId,
  sortSeasonalTasks,
} from '@/domain/garden/seasonalTasks';
import { normalizeSunProfile } from '@/domain/garden/sun';
import type {
  AppSettings,
  GardenJournalEntry,
  GardenPlanSummary,
  PlannerDocument,
  SeasonalTask,
  ValidationIssue,
} from '@/domain/garden/models';
import { validatePlannerDocument } from '@/domain/garden/validation';
import {
  normalizePreferredZoneTypes,
  parsePlantReferenceInput,
} from '@/domain/plants/compatibility';
import { seedPlantLibrary } from '@/domain/plants/seedLibrary';
import type { PlantDefinition } from '@/domain/plants/models';
import { getGardenRepository } from '@/repositories/repositoryFactory';
import type { WorkspaceBackupBundle } from '@/services/workspaceBackup';
import { useHistoryStore } from '@/stores/historyStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';
import { makeId } from '@/utils/id';

const clone = <T>(value: T): T => structuredClone(value);

const withPlanTimestamp = (document: PlannerDocument) => ({
  ...document,
  plan: {
    ...document.plan,
    updatedAt: new Date().toISOString(),
  },
});

const calculateIssues = (
  activeDocument: PlannerDocument | null,
  plantDefinitions: PlantDefinition[],
) => (activeDocument ? validatePlannerDocument(activeDocument, plantDefinitions) : []);

const resolvePlacementZoneId = (
  document: Pick<PlannerDocument, 'zones'>,
  placement: Pick<
    PlannerDocument['placements'][number],
    'gridX' | 'gridY' | 'footprintWidthCells' | 'footprintHeightCells'
  >,
) =>
  findGrowableZoneId(
    document.zones,
    placement.gridX,
    placement.gridY,
    placement.footprintWidthCells,
    placement.footprintHeightCells,
  );

const hasGeneratedSeasonalTaskChanged = (
  existingTask: SeasonalTask,
  nextTask: Omit<SeasonalTask, 'status' | 'createdAt' | 'updatedAt'>,
) =>
  existingTask.gardenPlanId !== nextTask.gardenPlanId ||
  existingTask.plantDefinitionId !== nextTask.plantDefinitionId ||
  existingTask.placementId !== nextTask.placementId ||
  existingTask.sourceKey !== nextTask.sourceKey ||
  existingTask.kind !== nextTask.kind ||
  existingTask.dueMonth !== nextTask.dueMonth ||
  existingTask.title !== nextTask.title ||
  existingTask.note !== nextTask.note;

export interface PlantDefinitionDraft {
  commonName: string;
  varietyName: string;
  plantFamily: string;
  category: PlantDefinition['category'];
  lifecycle: PlantDefinition['lifecycle'];
  spacingMm: number;
  spreadMm: number;
  heightMm: number;
  sunRequirement: PlantDefinition['sunRequirement'];
  waterRequirement: PlantDefinition['waterRequirement'];
  daysToMaturity: number;
  plantingWindowStartMonth: number | null;
  plantingWindowEndMonth: number | null;
  successionIntervalDays: number | null;
  companionPlantNames: string;
  conflictPlantNames: string;
  preferredZoneTypes: PlantDefinition['preferredZoneTypes'];
  notes: string;
  isFavorite: boolean;
}

export interface SeasonalTaskDraft {
  title: string;
  note: string;
  dueMonth: number | null;
  kind: SeasonalTask['kind'];
  plantDefinitionId: string | null;
  placementId?: string | null;
}

interface PlacementCreationOptions {
  layoutPattern?: PlacementLayoutPattern;
  count?: number;
}

interface GardenStoreState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  settings: AppSettings;
  planSummaries: GardenPlanSummary[];
  plantDefinitions: PlantDefinition[];
  journalEntries: GardenJournalEntry[];
  seasonalTasks: SeasonalTask[];
  activeDocument: PlannerDocument | null;
  validationIssues: ValidationIssue[];
  activePlanId: string | null;
  dirty: boolean;
  lastSavedAt: string | null;
  initialize: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  loadPlan: (planId: string) => Promise<void>;
  createPlan: (input: CreatePlanInput & { templateId?: GardenTemplateId }) => Promise<string>;
  importPlanDocument: (
    document: PlannerDocument,
    plantDefinitions?: PlantDefinition[],
    journalEntries?: GardenJournalEntry[],
    seasonalTasks?: SeasonalTask[],
  ) => Promise<string>;
  restoreWorkspaceBackup: (bundle: WorkspaceBackupBundle) => Promise<number>;
  duplicatePlan: (planId: string) => Promise<string>;
  duplicatePlanForNextSeason: (planId: string) => Promise<string>;
  deletePlan: (planId: string) => Promise<void>;
  saveActiveDocument: () => Promise<void>;
  updatePlan: (patch: Partial<PlannerDocument['plan']>) => void;
  createZoneAt: (
    zoneType: PlannerDocument['zones'][number]['type'],
    gridX: number,
    gridY: number,
  ) => void;
  updateZones: (
    patches: Array<{
      zoneId: string;
      patch: Partial<PlannerDocument['zones'][number]>;
    }>,
  ) => void;
  updateZone: (zoneId: string, patch: Partial<PlannerDocument['zones'][number]>) => void;
  duplicateZone: (zoneId: string) => void;
  duplicateZones: (zoneIds: string[]) => void;
  removeZone: (zoneId: string) => void;
  removeZones: (zoneIds: string[]) => void;
  createPlacementAt: (
    plantDefinitionId: string,
    gridX: number,
    gridY: number,
    options?: PlacementCreationOptions,
  ) => void;
  updatePlacement: (
    placementId: string,
    patch: Partial<PlannerDocument['placements'][number]>,
  ) => void;
  updatePlacements: (
    patches: Array<{
      placementId: string;
      patch: Partial<PlannerDocument['placements'][number]>;
    }>,
  ) => void;
  duplicatePlacement: (placementId: string) => void;
  duplicatePlacements: (placementIds: string[]) => void;
  removePlacement: (placementId: string) => void;
  removePlacements: (placementIds: string[]) => void;
  undo: () => void;
  redo: () => void;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  savePlantDefinition: (
    draft: PlantDefinitionDraft,
    plantDefinitionId?: string,
  ) => Promise<void>;
  togglePlantFavorite: (plantDefinitionId: string) => Promise<void>;
  deletePlantDefinition: (plantDefinitionId: string) => Promise<void>;
  saveJournalEntry: (
    draft: Pick<GardenJournalEntry, 'title' | 'body' | 'observedOn'>,
    journalEntryId?: string,
  ) => Promise<void>;
  deleteJournalEntry: (journalEntryId: string) => Promise<void>;
  saveSeasonalTask: (
    draft: SeasonalTaskDraft,
    taskId?: string,
  ) => Promise<void>;
  deleteSeasonalTask: (taskId: string) => Promise<void>;
  syncSeasonalTasks: (referenceMonth: number) => Promise<void>;
  setSeasonalTaskStatus: (
    taskId: string,
    status: SeasonalTask['status'],
  ) => Promise<void>;
}

const commitDocument = (
  set: (partial: Partial<GardenStoreState>) => void,
  get: () => GardenStoreState,
  document: PlannerDocument,
) => {
  const nextDocument = withPlanTimestamp(document);
  useHistoryStore.getState().commit(nextDocument);
  set({
    activeDocument: nextDocument,
    dirty: true,
    validationIssues: calculateIssues(nextDocument, get().plantDefinitions),
  });
};

export const useGardenStore = create<GardenStoreState>((set, get) => ({
  status: 'idle',
  errorMessage: null,
  settings: createDefaultSettings(),
  planSummaries: [],
  plantDefinitions: [],
  journalEntries: [],
  seasonalTasks: [],
  activeDocument: null,
  validationIssues: [],
  activePlanId: null,
  dirty: false,
  lastSavedAt: null,
  initialize: async () => {
    set({ status: 'loading', errorMessage: null });

    try {
      const repository = getGardenRepository();
      const [storedSettings, storedPlants, storedPlans] = await Promise.all([
        repository.getSettings(),
        repository.listPlantDefinitions(),
        repository.listPlans(),
      ]);

      const settings = storedSettings ?? createDefaultSettings();

      if (!storedSettings) {
        await repository.saveSettings(settings);
      }

      const plantDefinitions =
        storedPlants.length > 0 ? storedPlants : clone(seedPlantLibrary);

      if (storedPlants.length === 0) {
        await repository.savePlantDefinitions(plantDefinitions);
      }

      set({
        status: 'ready',
        settings,
        plantDefinitions,
        planSummaries: storedPlans,
        journalEntries: [],
        seasonalTasks: [],
      });
      usePlannerUiStore.getState().selectPlan();
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Failed to initialize GardenGnome.',
      });
    }
  },
  refreshPlans: async () => {
    const repository = getGardenRepository();
    const planSummaries = await repository.listPlans();
    set({ planSummaries });
  },
  loadPlan: async (planId) => {
    const repository = getGardenRepository();
    const [document, journalEntries, seasonalTasks] = await Promise.all([
      repository.getPlanDocument(planId),
      repository.listJournalEntries(planId),
      repository.listSeasonalTasks(planId),
    ]);

    if (!document) {
      set({
        errorMessage: `Plan ${planId} was not found.`,
      });
      return;
    }

    useHistoryStore.getState().initialize(document);
    usePlannerUiStore.getState().selectPlan();
    set({
      activeDocument: document,
      activePlanId: planId,
      journalEntries,
      seasonalTasks,
      dirty: false,
      lastSavedAt: document.plan.updatedAt,
      validationIssues: calculateIssues(document, get().plantDefinitions),
    });
  },
  createPlan: async (input) => {
    const repository = getGardenRepository();
    const { templateId, ...planInput } = input;
    const document = createPlannerDocument({
      ...planInput,
      cellSizeMm: planInput.cellSizeMm ?? get().settings.defaultCellSizeMm,
      measurementSystem: planInput.measurementSystem ?? get().settings.measurementSystem,
    });
    const seededDocument = templateId
      ? applyGardenTemplate(document, templateId)
      : document;

    await repository.savePlanDocument(seededDocument);
    await get().refreshPlans();
    await get().loadPlan(seededDocument.plan.id);

    return seededDocument.plan.id;
  },
  importPlanDocument: async (
    document,
    importedPlantDefinitions = [],
    importedJournalEntries = [],
    importedSeasonalTasks = [],
  ) => {
    const repository = getGardenRepository();
    const timestamp = new Date().toISOString();
    const importedPlanId = makeId('plan');
    const zoneIdMap = new Map<string, string>();
    const nextPlantDefinitions =
      importedPlantDefinitions.length > 0
        ? [
            ...get().plantDefinitions.filter(
              (plant) =>
                !importedPlantDefinitions.some(
                  (importedPlant) => importedPlant.id === plant.id,
                ),
            ),
            ...importedPlantDefinitions,
          ]
        : get().plantDefinitions;
    const imported: PlannerDocument = {
      plan: {
        ...document.plan,
        id: importedPlanId,
        name: `${document.plan.name} Imported`,
        seasonFamilyId: importedPlanId,
        sourcePlanId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      zones: document.zones.map((zone) => {
        const importedZoneId = makeId('zone');
        zoneIdMap.set(zone.id, importedZoneId);

        return {
          ...zone,
          id: importedZoneId,
          gardenPlanId: importedPlanId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }),
      placements: document.placements.map((placement) => ({
        ...placement,
        id: makeId('placement'),
        gardenPlanId: importedPlanId,
        zoneId: placement.zoneId ? zoneIdMap.get(placement.zoneId) ?? null : null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    };

    if (importedPlantDefinitions.length > 0) {
      await repository.savePlantDefinitions(nextPlantDefinitions);
      set({ plantDefinitions: nextPlantDefinitions });
    }

    await repository.savePlanDocument(imported);
    await Promise.all(
      importedJournalEntries.map((entry) =>
        repository.saveJournalEntry({
          ...entry,
          id: makeId('journal'),
          gardenPlanId: importedPlanId,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      ),
    );
    await Promise.all(
      importedSeasonalTasks.map((task) =>
        repository.saveSeasonalTask({
          ...task,
          id: task.sourceKey
            ? makeSeasonalTaskId(importedPlanId, task.sourceKey)
            : makeId('seasonal-task'),
          gardenPlanId: importedPlanId,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      ),
    );
    await get().refreshPlans();
    return imported.plan.id;
  },
  restoreWorkspaceBackup: async (bundle) => {
    const repository = getGardenRepository();
    const timestamp = new Date().toISOString();
    const existingPlantDefinitions = get().plantDefinitions;
    const mergedPlantDefinitions =
      bundle.plantDefinitions.length > 0
        ? [
            ...existingPlantDefinitions.filter(
              (plant) =>
                !bundle.plantDefinitions.some(
                  (importedPlant) => importedPlant.id === plant.id,
                ),
            ),
            ...bundle.plantDefinitions.map((plant) => ({
              ...plant,
              updatedAt: timestamp,
            })),
          ]
        : existingPlantDefinitions;
    const planIdMap = new Map(
      bundle.documents.map((document) => [document.plan.id, makeId('plan')]),
    );
    const placementIdMaps = new Map<string, Map<string, string>>();
    const restoredDocuments = bundle.documents.map((document) => {
      const restoredPlanId = planIdMap.get(document.plan.id) ?? makeId('plan');
      const zoneIdMap = new Map<string, string>();
      const placementIdMap = new Map<string, string>();
      const restoredZones = document.zones.map((zone) => {
        const restoredZoneId = makeId('zone');
        zoneIdMap.set(zone.id, restoredZoneId);

        return {
          ...zone,
          id: restoredZoneId,
          gardenPlanId: restoredPlanId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      });
      const restoredPlacements = document.placements.map((placement) => {
        const restoredPlacementId = makeId('placement');
        placementIdMap.set(placement.id, restoredPlacementId);

        return {
          ...placement,
          id: restoredPlacementId,
          gardenPlanId: restoredPlanId,
          zoneId: placement.zoneId ? zoneIdMap.get(placement.zoneId) ?? null : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      });

      placementIdMaps.set(document.plan.id, placementIdMap);

      return {
        plan: {
          ...document.plan,
          id: restoredPlanId,
          seasonFamilyId: document.plan.seasonFamilyId
            ? planIdMap.get(document.plan.seasonFamilyId) ?? restoredPlanId
            : restoredPlanId,
          sourcePlanId: document.plan.sourcePlanId
            ? planIdMap.get(document.plan.sourcePlanId) ?? null
            : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        zones: restoredZones,
        placements: restoredPlacements,
      } satisfies PlannerDocument;
    });
    const restoredSettings = {
      ...bundle.settings,
      updatedAt: timestamp,
    };

    if (bundle.plantDefinitions.length > 0) {
      await repository.savePlantDefinitions(mergedPlantDefinitions);
    }

    await repository.saveSettings(restoredSettings);
    await Promise.all(
      restoredDocuments.map((document) => repository.savePlanDocument(document)),
    );
    await Promise.all(
      bundle.journalEntries.map((entry) => {
        const restoredPlanId = planIdMap.get(entry.gardenPlanId);

        if (!restoredPlanId) {
          return Promise.resolve();
        }

        return repository.saveJournalEntry({
          ...entry,
          id: makeId('journal'),
          gardenPlanId: restoredPlanId,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }),
    );
    await Promise.all(
      bundle.seasonalTasks.map((task) => {
        const restoredPlanId = planIdMap.get(task.gardenPlanId);

        if (!restoredPlanId) {
          return Promise.resolve();
        }

        return repository.saveSeasonalTask({
          ...task,
          id: task.sourceKey
            ? makeSeasonalTaskId(restoredPlanId, task.sourceKey)
            : makeId('seasonal-task'),
          gardenPlanId: restoredPlanId,
          placementId: task.placementId
            ? placementIdMaps.get(task.gardenPlanId)?.get(task.placementId) ?? null
            : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }),
    );

    const nextPlanSummaries = await repository.listPlans();

    set({
      settings: restoredSettings,
      planSummaries: nextPlanSummaries,
      plantDefinitions: mergedPlantDefinitions,
      validationIssues: calculateIssues(get().activeDocument, mergedPlantDefinitions),
    });

    return restoredDocuments.length;
  },
  duplicatePlan: async (planId) => {
    const repository = getGardenRepository();
    const duplicated = await repository.duplicatePlan(planId, makeId('plan'));

    await get().refreshPlans();
    return duplicated.plan.id;
  },
  duplicatePlanForNextSeason: async (planId) => {
    const repository = getGardenRepository();
    const source = await repository.getPlanDocument(planId);

    if (!source) {
      throw new Error(`Plan ${planId} was not found.`);
    }

    const nextSeasonTag = deriveNextSeasonTag(source.plan.seasonTag);
    const duplicated = await repository.duplicatePlan(planId, makeId('plan'), {
      name: formatSeasonDuplicateName(source.plan.name, nextSeasonTag),
      seasonTag: nextSeasonTag,
    });

    await get().refreshPlans();
    return duplicated.plan.id;
  },
  deletePlan: async (planId) => {
    const repository = getGardenRepository();
    await repository.deletePlan(planId);

    if (get().activePlanId === planId) {
      useHistoryStore.getState().clear();
      set({
        activeDocument: null,
        activePlanId: null,
        journalEntries: [],
        seasonalTasks: [],
        dirty: false,
        validationIssues: [],
      });
    }

    await get().refreshPlans();
  },
  saveActiveDocument: async () => {
    const repository = getGardenRepository();
    const activeDocument = get().activeDocument;

    if (!activeDocument) {
      return;
    }

    await repository.savePlanDocument(activeDocument);
    await get().refreshPlans();
    set({
      dirty: false,
      lastSavedAt: activeDocument.plan.updatedAt,
    });
  },
  updatePlan: (patch) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument) {
      return;
    }

    commitDocument(set, get, {
      ...clone(activeDocument),
      plan: (() => {
        const nextPlan = {
          ...activeDocument.plan,
          ...patch,
        };

        return {
          ...nextPlan,
          sunProfile: normalizeSunProfile(
            nextPlan.sunProfile,
            nextPlan.widthCells,
            nextPlan.heightCells,
          ),
        };
      })(),
    });
  },
  createZoneAt: (zoneType, gridX, gridY) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument) {
      return;
    }

    const timestamp = new Date().toISOString();
    const zone = createZone(
      activeDocument.plan.id,
      activeDocument.plan.widthCells,
      activeDocument.plan.heightCells,
      zoneType,
      gridX,
      gridY,
      timestamp,
    );

    commitDocument(set, get, {
      ...clone(activeDocument),
      zones: [...activeDocument.zones, zone],
    });
    usePlannerUiStore.getState().selectZone(zone.id);
  },
  updateZones: (patches) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument || patches.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const patchMap = new Map(patches.map(({ zoneId, patch }) => [zoneId, patch]));
    const nextZones = activeDocument.zones.map((zone) =>
      patchMap.has(zone.id)
        ? {
            ...zone,
            ...patchMap.get(zone.id),
            updatedAt: timestamp,
          }
        : zone,
    );
    const previousZonesById = new Map(activeDocument.zones.map((zone) => [zone.id, zone]));
    const nextZonesById = new Map(nextZones.map((zone) => [zone.id, zone]));

    commitDocument(set, get, {
      ...clone(activeDocument),
      zones: nextZones,
      placements: activeDocument.placements.map((placement) => {
        if (!placement.zoneId || !patchMap.has(placement.zoneId)) {
          return placement;
        }

        const previousZone = previousZonesById.get(placement.zoneId);
        const nextZone = nextZonesById.get(placement.zoneId);

        if (!previousZone || !nextZone) {
          return placement;
        }

        const nextPlacement = {
          ...placement,
          gridX: placement.gridX + (nextZone.gridX - previousZone.gridX),
          gridY: placement.gridY + (nextZone.gridY - previousZone.gridY),
        };
        const nextZoneId = resolvePlacementZoneId({ zones: nextZones }, nextPlacement);

        return {
          ...nextPlacement,
          zoneId: nextZoneId,
          updatedAt: timestamp,
        };
      }),
    });
  },
  updateZone: (zoneId, patch) => {
    get().updateZones([{ zoneId, patch }]);
  },
  duplicateZone: (zoneId) => {
    get().duplicateZones([zoneId]);
  },
  duplicateZones: (zoneIds) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument || zoneIds.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const zoneIdSet = new Set(zoneIds);
    const duplicated = activeDocument.zones
      .filter((zone) => zoneIdSet.has(zone.id))
      .map((source) => ({
        ...source,
        id: makeId('zone'),
        gridX: Math.min(
          activeDocument.plan.widthCells - source.widthCells,
          source.gridX + 1,
        ),
        gridY: Math.min(
          activeDocument.plan.heightCells - source.heightCells,
          source.gridY + 1,
        ),
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

    if (duplicated.length === 0) {
      return;
    }

    commitDocument(set, get, {
      ...clone(activeDocument),
      zones: [...activeDocument.zones, ...duplicated],
    });
  },
  removeZone: (zoneId) => {
    get().removeZones([zoneId]);
  },
  removeZones: (zoneIds) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument || zoneIds.length === 0) {
      return;
    }

    const zoneIdSet = new Set(zoneIds);

    commitDocument(set, get, {
      ...clone(activeDocument),
      zones: activeDocument.zones.filter((zone) => !zoneIdSet.has(zone.id)),
      placements: activeDocument.placements.map((placement) =>
        placement.zoneId && zoneIdSet.has(placement.zoneId)
          ? { ...placement, zoneId: null }
          : placement,
      ),
    });
    usePlannerUiStore.getState().clearSelection();
  },
  createPlacementAt: (plantDefinitionId, gridX, gridY, options) => {
    const activeDocument = get().activeDocument;
    const plantDefinition = get().plantDefinitions.find(
      (entry) => entry.id === plantDefinitionId,
    );

    if (!activeDocument || !plantDefinition) {
      return;
    }

    const placements = createPlacementLayout(
      activeDocument,
      plantDefinition,
      gridX,
      gridY,
      options,
    );

    commitDocument(set, get, {
      ...clone(activeDocument),
      placements: [...activeDocument.placements, ...placements],
    });

    const firstPlacement = placements[0];

    if (firstPlacement) {
      usePlannerUiStore.getState().selectPlacement(firstPlacement.id);
    }
  },
  updatePlacements: (patches) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument || patches.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const patchMap = new Map(
      patches.map(({ placementId, patch }) => [placementId, patch]),
    );

    commitDocument(set, get, {
      ...clone(activeDocument),
      placements: activeDocument.placements.map((placement) =>
        patchMap.has(placement.id)
          ? (() => {
              const nextPlacement = {
                ...placement,
                ...patchMap.get(placement.id),
              };

              return {
                ...nextPlacement,
                zoneId: resolvePlacementZoneId(activeDocument, nextPlacement),
                updatedAt: timestamp,
              };
            })()
          : placement,
      ),
    });
  },
  updatePlacement: (placementId, patch) => {
    get().updatePlacements([{ placementId, patch }]);
  },
  duplicatePlacement: (placementId) => {
    get().duplicatePlacements([placementId]);
  },
  duplicatePlacements: (placementIds) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument || placementIds.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const placementIdSet = new Set(placementIds);
    const duplicated = activeDocument.placements
      .filter((placement) => placementIdSet.has(placement.id))
      .map((source) => {
        const duplicatedPlacement = {
          ...source,
          id: makeId('placement'),
          gridX: Math.min(
            activeDocument.plan.widthCells - source.footprintWidthCells,
            source.gridX + 1,
          ),
          gridY: Math.min(
            activeDocument.plan.heightCells - source.footprintHeightCells,
            source.gridY + 1,
          ),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        return {
          ...duplicatedPlacement,
          zoneId: resolvePlacementZoneId(activeDocument, duplicatedPlacement),
        };
      });

    if (duplicated.length === 0) {
      return;
    }

    commitDocument(set, get, {
      ...clone(activeDocument),
      placements: [...activeDocument.placements, ...duplicated],
    });
  },
  removePlacement: (placementId) => {
    get().removePlacements([placementId]);
  },
  removePlacements: (placementIds) => {
    const activeDocument = get().activeDocument;

    if (!activeDocument || placementIds.length === 0) {
      return;
    }

    const placementIdSet = new Set(placementIds);

    commitDocument(set, get, {
      ...clone(activeDocument),
      placements: activeDocument.placements.filter(
        (placement) => !placementIdSet.has(placement.id),
      ),
    });
    usePlannerUiStore.getState().clearSelection();
  },
  undo: () => {
    useHistoryStore.getState().undo();
    const present = useHistoryStore.getState().present;
    set({
      activeDocument: present ? clone(present) : null,
      dirty: true,
      validationIssues: calculateIssues(present, get().plantDefinitions),
    });
  },
  redo: () => {
    useHistoryStore.getState().redo();
    const present = useHistoryStore.getState().present;
    set({
      activeDocument: present ? clone(present) : null,
      dirty: true,
      validationIssues: calculateIssues(present, get().plantDefinitions),
    });
  },
  updateSettings: async (patch) => {
    const repository = getGardenRepository();
    const nextSettings = {
      ...get().settings,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await repository.saveSettings(nextSettings);
    set({ settings: nextSettings });
  },
  savePlantDefinition: async (draft, plantDefinitionId) => {
    const repository = getGardenRepository();
    const timestamp = new Date().toISOString();
    const existing = get().plantDefinitions.find((plant) => plant.id === plantDefinitionId);
    const normalizedDraft = {
      ...draft,
      plantFamily: draft.plantFamily.trim() || null,
      companionPlantNames: parsePlantReferenceInput(draft.companionPlantNames),
      conflictPlantNames: parsePlantReferenceInput(draft.conflictPlantNames),
      preferredZoneTypes: normalizePreferredZoneTypes(draft.preferredZoneTypes),
    };
    const plantDefinitions = existing
      ? get().plantDefinitions.map((plant) =>
          plant.id === plantDefinitionId
            ? {
                ...plant,
                ...normalizedDraft,
                updatedAt: timestamp,
              }
            : plant,
        )
      : [
          ...get().plantDefinitions,
          {
            id: makeId('plant'),
            ...normalizedDraft,
            isCustom: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ];

    await repository.savePlantDefinitions(plantDefinitions);
    set({
      plantDefinitions,
      validationIssues: calculateIssues(get().activeDocument, plantDefinitions),
    });
  },
  togglePlantFavorite: async (plantDefinitionId) => {
    const repository = getGardenRepository();
    const plantDefinitions = get().plantDefinitions.map((plant) =>
      plant.id === plantDefinitionId
        ? {
            ...plant,
            isFavorite: !plant.isFavorite,
            updatedAt: new Date().toISOString(),
          }
        : plant,
    );

    await repository.savePlantDefinitions(plantDefinitions);
    set({
      plantDefinitions,
      validationIssues: calculateIssues(get().activeDocument, plantDefinitions),
    });
  },
  saveJournalEntry: async (draft, journalEntryId) => {
    const repository = getGardenRepository();
    const activeDocument = get().activeDocument;

    if (!activeDocument) {
      return;
    }

    const timestamp = new Date().toISOString();
    const existingEntry = get().journalEntries.find((entry) => entry.id === journalEntryId);
    const journalEntry: GardenJournalEntry = existingEntry
      ? {
          ...existingEntry,
          title: draft.title.trim(),
          body: draft.body.trim(),
          observedOn: draft.observedOn,
          updatedAt: timestamp,
        }
      : {
          id: makeId('journal'),
          gardenPlanId: activeDocument.plan.id,
          title: draft.title.trim(),
          body: draft.body.trim(),
          observedOn: draft.observedOn,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await repository.saveJournalEntry(journalEntry);
    set((state) => ({
      journalEntries: [...state.journalEntries.filter((entry) => entry.id !== journalEntry.id), journalEntry]
        .sort(
          (left, right) =>
            right.observedOn.localeCompare(left.observedOn) ||
            right.createdAt.localeCompare(left.createdAt),
        ),
    }));
  },
  deleteJournalEntry: async (journalEntryId) => {
    const repository = getGardenRepository();

    await repository.deleteJournalEntry(journalEntryId);
    set((state) => ({
      journalEntries: state.journalEntries.filter((entry) => entry.id !== journalEntryId),
    }));
  },
  saveSeasonalTask: async (draft, taskId) => {
    const repository = getGardenRepository();
    const activeDocument = get().activeDocument;

    if (!activeDocument) {
      return;
    }

    const timestamp = new Date().toISOString();
    const existingTask = get().seasonalTasks.find((task) => task.id === taskId);
    const normalizedTitle = draft.title.trim();

    if (!normalizedTitle) {
      return;
    }

    const seasonalTask: SeasonalTask = existingTask
      ? {
          ...existingTask,
          title: normalizedTitle,
          note: draft.note.trim(),
          dueMonth: draft.dueMonth ?? null,
          kind: draft.kind,
          plantDefinitionId: draft.plantDefinitionId ?? null,
          placementId: draft.placementId ?? existingTask.placementId ?? null,
          updatedAt: timestamp,
        }
      : {
          id: makeId('seasonal-task'),
          gardenPlanId: activeDocument.plan.id,
          plantDefinitionId: draft.plantDefinitionId ?? null,
          placementId: draft.placementId ?? null,
          sourceKey: null,
          kind: draft.kind,
          status: 'pending',
          dueMonth: draft.dueMonth ?? null,
          title: normalizedTitle,
          note: draft.note.trim(),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await repository.saveSeasonalTask(seasonalTask);
    set((state) => ({
      seasonalTasks: sortSeasonalTasks(
        state.seasonalTasks
          .filter((task) => task.id !== seasonalTask.id)
          .concat(seasonalTask),
      ),
    }));
  },
  deleteSeasonalTask: async (taskId) => {
    const repository = getGardenRepository();

    await repository.deleteSeasonalTask(taskId);
    set((state) => ({
      seasonalTasks: state.seasonalTasks.filter((task) => task.id !== taskId),
    }));
  },
  syncSeasonalTasks: async (referenceMonth) => {
    const repository = getGardenRepository();
    const activeDocument = get().activeDocument;

    if (!activeDocument) {
      return;
    }

    const timestamp = new Date().toISOString();
    const generatedTasks = buildGeneratedSeasonalTasks(
      activeDocument,
      get().plantDefinitions,
      referenceMonth,
    );
    const existingTasks = get().seasonalTasks;
    const manualTasks = existingTasks.filter((task) => !task.sourceKey);
    const existingGeneratedBySourceKey = new Map(
      existingTasks
        .filter((task): task is SeasonalTask & { sourceKey: string } => Boolean(task.sourceKey))
        .map((task) => [task.sourceKey, task]),
    );
    const nextGeneratedTasks = generatedTasks.map((generatedTask) => {
      const sourceKey = generatedTask.sourceKey;
      const existingTask =
        sourceKey ? existingGeneratedBySourceKey.get(sourceKey) : undefined;
      const nextTaskBase = {
        id:
          existingTask?.id ??
          (sourceKey
            ? makeSeasonalTaskId(activeDocument.plan.id, sourceKey)
            : makeId('seasonal-task')),
        gardenPlanId: activeDocument.plan.id,
        plantDefinitionId: generatedTask.plantDefinitionId,
        placementId: generatedTask.placementId,
        sourceKey: generatedTask.sourceKey,
        kind: generatedTask.kind,
        dueMonth: generatedTask.dueMonth,
        title: generatedTask.title,
        note: generatedTask.note,
      } satisfies Omit<SeasonalTask, 'status' | 'createdAt' | 'updatedAt'>;

      if (!existingTask) {
        const createdTask: SeasonalTask = {
          ...nextTaskBase,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        return {
          task: createdTask,
          changed: true,
        };
      }

      const changed = hasGeneratedSeasonalTaskChanged(existingTask, nextTaskBase);

      return {
        task: {
          ...existingTask,
          ...nextTaskBase,
          updatedAt: changed ? timestamp : existingTask.updatedAt,
        },
        changed,
      };
    });
    const nextGeneratedSourceKeys = new Set(
      generatedTasks
        .map((task) => task.sourceKey)
        .filter((sourceKey): sourceKey is string => Boolean(sourceKey)),
    );
    const staleGeneratedTasks = existingTasks.filter(
      (task) => task.sourceKey && !nextGeneratedSourceKeys.has(task.sourceKey),
    );
    const changedTasks = nextGeneratedTasks
      .filter((entry) => entry.changed)
      .map((entry) => entry.task);

    if (changedTasks.length > 0) {
      await Promise.all(
        changedTasks.map((task) => repository.saveSeasonalTask(task)),
      );
    }

    if (staleGeneratedTasks.length > 0) {
      await Promise.all(
        staleGeneratedTasks.map((task) => repository.deleteSeasonalTask(task.id)),
      );
    }

    set({
      seasonalTasks: sortSeasonalTasks([
        ...manualTasks,
        ...nextGeneratedTasks.map((entry) => entry.task),
      ]),
    });
  },
  setSeasonalTaskStatus: async (taskId, status) => {
    const repository = getGardenRepository();
    const existingTask = get().seasonalTasks.find((task) => task.id === taskId);

    if (!existingTask || existingTask.status === status) {
      return;
    }

    const nextTask: SeasonalTask = {
      ...existingTask,
      status,
      updatedAt: new Date().toISOString(),
    };

    await repository.saveSeasonalTask(nextTask);
    set((state) => ({
      seasonalTasks: sortSeasonalTasks(
        state.seasonalTasks.map((task) => (task.id === taskId ? nextTask : task)),
      ),
    }));
  },
  deletePlantDefinition: async (plantDefinitionId) => {
    const repository = getGardenRepository();
    const plantDefinitions = get().plantDefinitions.filter(
      (plant) => plant.id !== plantDefinitionId,
    );
    const activeDocument = get().activeDocument;
    const removedPlacementIds = new Set(
      activeDocument?.placements
        .filter((placement) => placement.plantDefinitionId === plantDefinitionId)
        .map((placement) => placement.id) ?? [],
    );
    const nextActiveDocument = activeDocument
      ? {
          ...clone(activeDocument),
          placements: activeDocument.placements.filter(
            (placement) => placement.plantDefinitionId !== plantDefinitionId,
          ),
        }
      : null;

    await repository.savePlantDefinitions(plantDefinitions);

    if (
      removedPlacementIds.size > 0 &&
      usePlannerUiStore
        .getState()
        .selection.ids.some((id) => removedPlacementIds.has(id))
    ) {
      usePlannerUiStore.getState().clearSelection();
    }

    set({
      plantDefinitions,
      activeDocument: nextActiveDocument,
      seasonalTasks: get().seasonalTasks.filter(
        (task) => task.plantDefinitionId !== plantDefinitionId,
      ),
      validationIssues: calculateIssues(nextActiveDocument, plantDefinitions),
    });
  },
}));
