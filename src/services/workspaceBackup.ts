import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { z, ZodError } from 'zod';

import { createDefaultSettings } from '@/domain/garden/defaults';
import {
  appSettingsSchema,
  gardenJournalEntrySchema,
  plannerDocumentSchema,
  seasonalTaskSchema,
} from '@/domain/garden/schemas';
import type {
  AppSettings,
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import { plantDefinitionSchema } from '@/domain/plants/schemas';
import type { PlantDefinition } from '@/domain/plants/models';
import type { GardenRepository } from '@/repositories/contracts';
import { getGardenRepository } from '@/repositories/repositoryFactory';

const workspaceBackupApp = 'GardenGnome';
const workspaceBackupKind = 'workspaceBackup';
const workspaceBackupVersion = 1;

const workspaceBackupEnvelopeSchema = z.object({
  app: z.literal(workspaceBackupApp),
  kind: z.literal(workspaceBackupKind),
  version: z.number().int(),
  exportedAt: z.string(),
  settings: appSettingsSchema,
  plantDefinitions: z.array(plantDefinitionSchema),
  documents: z.array(plannerDocumentSchema),
  journalEntries: z.array(gardenJournalEntrySchema),
  seasonalTasks: z.array(seasonalTaskSchema),
});

export interface WorkspaceBackupPayload {
  settings: AppSettings;
  plantDefinitions: PlantDefinition[];
  documents: PlannerDocument[];
  journalEntries: GardenJournalEntry[];
  seasonalTasks: SeasonalTask[];
}

export interface WorkspaceBackupBundle extends WorkspaceBackupPayload {
  exportedAt: string;
}

const formatWorkspaceBackupFilename = (exportedAt: string) =>
  `gardengnome-workspace-backup-${exportedAt.slice(0, 10)}.json`;

const readFileInBrowser = () =>
  new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        resolve(null);
        return;
      }

      resolve(await file.text());
    };
    input.click();
  });

export const serializeWorkspaceBackup = ({
  settings,
  plantDefinitions,
  documents,
  journalEntries,
  seasonalTasks,
}: WorkspaceBackupPayload) =>
  JSON.stringify(
    {
      app: workspaceBackupApp,
      kind: workspaceBackupKind,
      version: workspaceBackupVersion,
      exportedAt: new Date().toISOString(),
      settings: appSettingsSchema.parse(settings),
      plantDefinitions: plantDefinitions.map((plant) => plantDefinitionSchema.parse(plant)),
      documents: documents.map((document) => plannerDocumentSchema.parse(document)),
      journalEntries: journalEntries.map((entry) => gardenJournalEntrySchema.parse(entry)),
      seasonalTasks: seasonalTasks.map((task) => seasonalTaskSchema.parse(task)),
    },
    null,
    2,
  );

export const parseWorkspaceBackupBundle = (raw: string): WorkspaceBackupBundle => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('The selected file is not a valid JSON file.');
  }

  try {
    const envelope = workspaceBackupEnvelopeSchema.parse(parsed);

    if (envelope.version !== workspaceBackupVersion) {
      throw new Error(
        `Unsupported GardenGnome workspace backup version ${envelope.version}.`,
      );
    }

    return {
      exportedAt: envelope.exportedAt,
      settings: envelope.settings,
      plantDefinitions: envelope.plantDefinitions,
      documents: envelope.documents,
      journalEntries: envelope.journalEntries,
      seasonalTasks: envelope.seasonalTasks,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const detail = firstIssue ? ` ${firstIssue.path.join('.')}: ${firstIssue.message}` : '';

      throw new Error(
        `The selected file is not a valid GardenGnome workspace backup.${detail}`,
      );
    }

    throw error;
  }
};

export const collectWorkspaceBackup = async (
  repository: GardenRepository = getGardenRepository(),
): Promise<WorkspaceBackupPayload> => {
  const [settings, plantDefinitions, planSummaries] = await Promise.all([
    repository.getSettings(),
    repository.listPlantDefinitions(),
    repository.listPlans(),
  ]);
  const documents = (
    await Promise.all(planSummaries.map((plan) => repository.getPlanDocument(plan.id)))
  ).filter((document): document is PlannerDocument => Boolean(document));
  const [journalEntriesByPlan, seasonalTasksByPlan] = await Promise.all([
    Promise.all(documents.map((document) => repository.listJournalEntries(document.plan.id))),
    Promise.all(documents.map((document) => repository.listSeasonalTasks(document.plan.id))),
  ]);

  return {
    settings: settings ?? createDefaultSettings(),
    plantDefinitions,
    documents,
    journalEntries: journalEntriesByPlan.flat(),
    seasonalTasks: seasonalTasksByPlan.flat(),
  };
};

export const exportWorkspaceBackup = async (
  repository: GardenRepository = getGardenRepository(),
) => {
  const payload = await collectWorkspaceBackup(repository);
  const serialized = serializeWorkspaceBackup(payload);
  const exportedAt = new Date().toISOString();

  if (isTauri()) {
    const target = await save({
      defaultPath: formatWorkspaceBackupFilename(exportedAt),
      filters: [{ name: 'GardenGnome Workspace Backup', extensions: ['json'] }],
    });

    if (!target) {
      return;
    }

    await writeTextFile(target, serialized);
    return;
  }

  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = formatWorkspaceBackupFilename(exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
};

export const importWorkspaceBackup = async (): Promise<WorkspaceBackupBundle | null> => {
  const raw = isTauri()
    ? await (async () => {
        const source = await open({
          multiple: false,
          filters: [{ name: 'GardenGnome Workspace Backup', extensions: ['json'] }],
        });

        if (!source || Array.isArray(source)) {
          return null;
        }

        return readTextFile(source);
      })()
    : await readFileInBrowser();

  if (!raw) {
    return null;
  }

  return parseWorkspaceBackupBundle(raw);
};
