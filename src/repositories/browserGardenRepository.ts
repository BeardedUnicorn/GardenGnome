import type {
  AppSettings,
  GardenJournalEntry,
  GardenPlanSummary,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import { sortSeasonalTasks } from '@/domain/garden/seasonalTasks';
import { normalizeSunProfile } from '@/domain/garden/sun';
import { normalizePlantCompatibility } from '@/domain/plants/compatibility';
import type { PlantDefinition } from '@/domain/plants/models';
import type {
  DuplicatePlanOptions,
  GardenRepository,
} from '@/repositories/contracts';

const storageKeys = {
  plans: 'garden-gnome:plans',
  plants: 'garden-gnome:plants',
  journals: 'garden-gnome:journals',
  seasonalTasks: 'garden-gnome:seasonal-tasks',
  settings: 'garden-gnome:settings',
} as const;

const parseStorage = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const clone = <T>(value: T): T => structuredClone(value);
const sortJournalEntries = (left: GardenJournalEntry, right: GardenJournalEntry) =>
  right.observedOn.localeCompare(left.observedOn) ||
  right.createdAt.localeCompare(left.createdAt);
const normalizePlan = (
  plan: PlannerDocument['plan'],
): PlannerDocument['plan'] => ({
  ...plan,
  seasonFamilyId: plan.seasonFamilyId ?? plan.id,
  sourcePlanId: plan.sourcePlanId ?? null,
  sunProfile: normalizeSunProfile(plan.sunProfile, plan.widthCells, plan.heightCells),
});
const normalizePlannerDocument = (document: PlannerDocument): PlannerDocument => ({
  ...document,
  plan: normalizePlan(document.plan),
});
const normalizePlantDefinition = (plant: PlantDefinition): PlantDefinition => ({
  ...normalizePlantCompatibility(plant),
  plantFamily: plant.plantFamily?.trim() || null,
  plantingWindowStartMonth: plant.plantingWindowStartMonth ?? null,
  plantingWindowEndMonth: plant.plantingWindowEndMonth ?? null,
  successionIntervalDays: plant.successionIntervalDays ?? null,
});
const normalizeJournalEntry = (entry: GardenJournalEntry): GardenJournalEntry => ({
  ...entry,
  title: entry.title.trim(),
  body: entry.body.trim(),
});
const normalizeSeasonalTask = (task: SeasonalTask): SeasonalTask => ({
  ...task,
  plantDefinitionId: task.plantDefinitionId ?? null,
  placementId: task.placementId ?? null,
  sourceKey: task.sourceKey?.trim() || null,
  dueMonth: task.dueMonth ?? null,
  title: task.title.trim(),
  note: task.note.trim(),
});

const listSummaries = (documents: PlannerDocument[]): GardenPlanSummary[] =>
  documents
    .map(({ plan }) => {
      const normalizedPlan = normalizePlan(plan);

      return {
        id: plan.id,
        name: normalizedPlan.name,
        locationLabel: normalizedPlan.locationLabel,
        measurementSystem: normalizedPlan.measurementSystem,
        widthCells: normalizedPlan.widthCells,
        heightCells: normalizedPlan.heightCells,
        cellSizeMm: normalizedPlan.cellSizeMm,
        seasonTag: normalizedPlan.seasonTag,
        seasonFamilyId: normalizedPlan.seasonFamilyId,
        sourcePlanId: normalizedPlan.sourcePlanId,
        updatedAt: normalizedPlan.updatedAt,
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export class BrowserGardenRepository implements GardenRepository {
  async listPlans(): Promise<GardenPlanSummary[]> {
    return listSummaries(parseStorage<PlannerDocument[]>(storageKeys.plans, []));
  }

  async getPlanDocument(planId: string): Promise<PlannerDocument | null> {
    const documents = parseStorage<PlannerDocument[]>(storageKeys.plans, []);
    const document = documents.find((entry) => entry.plan.id === planId) ?? null;

    return document ? clone(normalizePlannerDocument(document)) : null;
  }

  async savePlanDocument(document: PlannerDocument): Promise<void> {
    const documents = parseStorage<PlannerDocument[]>(storageKeys.plans, []);
    const nextDocuments = documents.filter(
      (entry) => entry.plan.id !== document.plan.id,
    );

    nextDocuments.push(clone(normalizePlannerDocument(document)));
    writeStorage(storageKeys.plans, nextDocuments);
  }

  async duplicatePlan(
    planId: string,
    newPlanId: string,
    options?: DuplicatePlanOptions,
  ): Promise<PlannerDocument> {
    const current = await this.getPlanDocument(planId);

    if (!current) {
      throw new Error(`Unable to duplicate missing plan ${planId}.`);
    }

    const duplicated = clone(current);
    const timestamp = new Date().toISOString();
    const zoneIdMap = new Map<string, string>();

    duplicated.plan.id = newPlanId;
    duplicated.plan.name = options?.name ?? `${duplicated.plan.name} Copy`;
    duplicated.plan.seasonTag =
      options?.seasonTag === undefined ? duplicated.plan.seasonTag : options.seasonTag;
    duplicated.plan.seasonFamilyId =
      duplicated.plan.seasonFamilyId ?? current.plan.seasonFamilyId ?? current.plan.id;
    duplicated.plan.sourcePlanId = planId;
    duplicated.plan.createdAt = timestamp;
    duplicated.plan.updatedAt = timestamp;
    duplicated.zones = duplicated.zones.map((zone, index) => ({
      ...zone,
      id: (() => {
        const duplicatedZoneId = `${newPlanId}:zone:${index}`;
        zoneIdMap.set(zone.id, duplicatedZoneId);
        return duplicatedZoneId;
      })(),
      gardenPlanId: newPlanId,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    duplicated.placements = duplicated.placements.map((placement, index) => ({
      ...placement,
      id: `${newPlanId}:placement:${index}`,
      gardenPlanId: newPlanId,
      zoneId: placement.zoneId ? zoneIdMap.get(placement.zoneId) ?? null : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await this.savePlanDocument(duplicated);
    return duplicated;
  }

  async deletePlan(planId: string): Promise<void> {
    const documents = parseStorage<PlannerDocument[]>(storageKeys.plans, []);
    const journalEntries = parseStorage<GardenJournalEntry[]>(storageKeys.journals, []);
    const seasonalTasks = parseStorage<SeasonalTask[]>(storageKeys.seasonalTasks, []);

    writeStorage(
      storageKeys.plans,
      documents.filter((document) => document.plan.id !== planId),
    );
    writeStorage(
      storageKeys.journals,
      journalEntries.filter((entry) => entry.gardenPlanId !== planId),
    );
    writeStorage(
      storageKeys.seasonalTasks,
      seasonalTasks.filter((task) => task.gardenPlanId !== planId),
    );
  }

  async listPlantDefinitions(): Promise<PlantDefinition[]> {
    return clone(parseStorage<PlantDefinition[]>(storageKeys.plants, [])).map(
      normalizePlantDefinition,
    );
  }

  async savePlantDefinitions(plants: PlantDefinition[]): Promise<void> {
    const normalizedPlants = clone(plants).map(normalizePlantDefinition);
    const validPlantIds = new Set(normalizedPlants.map((plant) => plant.id));
    const documents = parseStorage<PlannerDocument[]>(storageKeys.plans, []);
    const seasonalTasks = parseStorage<SeasonalTask[]>(storageKeys.seasonalTasks, []);

    writeStorage(
      storageKeys.plants,
      normalizedPlants,
    );
    writeStorage(
      storageKeys.plans,
      documents.map((document) => {
        const normalizedDocument = normalizePlannerDocument(document);

        return {
          ...normalizedDocument,
          placements: normalizedDocument.placements.filter((placement) =>
            validPlantIds.has(placement.plantDefinitionId),
          ),
        };
      }),
    );
    writeStorage(
      storageKeys.seasonalTasks,
      seasonalTasks
        .map(normalizeSeasonalTask)
        .filter(
          (task) =>
            task.plantDefinitionId === null || validPlantIds.has(task.plantDefinitionId),
        ),
    );
  }

  async listJournalEntries(planId: string): Promise<GardenJournalEntry[]> {
    return clone(
      parseStorage<GardenJournalEntry[]>(storageKeys.journals, [])
        .map(normalizeJournalEntry)
        .filter((entry) => entry.gardenPlanId === planId)
        .sort(sortJournalEntries),
    );
  }

  async saveJournalEntry(entry: GardenJournalEntry): Promise<void> {
    const journalEntries = parseStorage<GardenJournalEntry[]>(storageKeys.journals, []);
    const nextEntries = journalEntries
      .filter((existingEntry) => existingEntry.id !== entry.id)
      .concat(normalizeJournalEntry(clone(entry)));

    writeStorage(storageKeys.journals, nextEntries);
  }

  async deleteJournalEntry(entryId: string): Promise<void> {
    const journalEntries = parseStorage<GardenJournalEntry[]>(storageKeys.journals, []);

    writeStorage(
      storageKeys.journals,
      journalEntries.filter((entry) => entry.id !== entryId),
    );
  }

  async listSeasonalTasks(planId: string): Promise<SeasonalTask[]> {
    return sortSeasonalTasks(
      clone(
        parseStorage<SeasonalTask[]>(storageKeys.seasonalTasks, [])
          .map(normalizeSeasonalTask)
          .filter((task) => task.gardenPlanId === planId),
      ),
    );
  }

  async saveSeasonalTask(task: SeasonalTask): Promise<void> {
    const seasonalTasks = parseStorage<SeasonalTask[]>(storageKeys.seasonalTasks, []);
    const nextTasks = seasonalTasks
      .filter((existingTask) => existingTask.id !== task.id)
      .concat(normalizeSeasonalTask(clone(task)));

    writeStorage(storageKeys.seasonalTasks, sortSeasonalTasks(nextTasks));
  }

  async deleteSeasonalTask(taskId: string): Promise<void> {
    const seasonalTasks = parseStorage<SeasonalTask[]>(storageKeys.seasonalTasks, []);

    writeStorage(
      storageKeys.seasonalTasks,
      seasonalTasks.filter((task) => task.id !== taskId),
    );
  }

  async getSettings(): Promise<AppSettings | null> {
    return clone(parseStorage<AppSettings | null>(storageKeys.settings, null));
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    writeStorage(storageKeys.settings, clone(settings));
  }
}
