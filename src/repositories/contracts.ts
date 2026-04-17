import type {
  AppSettings,
  GardenJournalEntry,
  GardenPlanSummary,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';

export interface DuplicatePlanOptions {
  name?: string;
  seasonTag?: string | null;
}

export interface GardenRepository {
  listPlans(): Promise<GardenPlanSummary[]>;
  getPlanDocument(planId: string): Promise<PlannerDocument | null>;
  savePlanDocument(document: PlannerDocument): Promise<void>;
  duplicatePlan(
    planId: string,
    newPlanId: string,
    options?: DuplicatePlanOptions,
  ): Promise<PlannerDocument>;
  deletePlan(planId: string): Promise<void>;
  listPlantDefinitions(): Promise<PlantDefinition[]>;
  savePlantDefinitions(plants: PlantDefinition[]): Promise<void>;
  listJournalEntries(planId: string): Promise<GardenJournalEntry[]>;
  saveJournalEntry(entry: GardenJournalEntry): Promise<void>;
  deleteJournalEntry(entryId: string): Promise<void>;
  listSeasonalTasks(planId: string): Promise<SeasonalTask[]>;
  saveSeasonalTask(task: SeasonalTask): Promise<void>;
  deleteSeasonalTask(taskId: string): Promise<void>;
  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;
}
