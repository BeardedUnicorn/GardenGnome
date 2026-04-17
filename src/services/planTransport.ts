import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { z, ZodError } from 'zod';

import {
  gardenJournalEntrySchema,
  plannerDocumentSchema,
  seasonalTaskSchema,
} from '@/domain/garden/schemas';
import type {
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
} from '@/domain/garden/models';
import { plantDefinitionSchema } from '@/domain/plants/schemas';
import type { PlantDefinition } from '@/domain/plants/models';

const plannerDocumentExportApp = 'GardenGnome';
const plannerDocumentExportKind = 'plannerDocument';
const plannerDocumentExportVersion = 1;

const plannerDocumentExportEnvelopeSchema = z.object({
  app: z.literal(plannerDocumentExportApp),
  kind: z.literal(plannerDocumentExportKind),
  version: z.number().int(),
  exportedAt: z.string(),
  document: plannerDocumentSchema,
  plantDefinitions: z.array(plantDefinitionSchema).default([]),
  journalEntries: z.array(gardenJournalEntrySchema).default([]),
  seasonalTasks: z.array(seasonalTaskSchema).default([]),
});

export interface PlannerDocumentImportBundle {
  document: PlannerDocument;
  plantDefinitions: PlantDefinition[];
  journalEntries: GardenJournalEntry[];
  seasonalTasks: SeasonalTask[];
}

const formatPlanFilename = (plannerDocument: PlannerDocument) =>
  `${plannerDocument.plan.name.replace(/\s+/g, '-').toLowerCase()}.json`;

const collectReferencedPlantDefinitions = (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const referencedPlantIds = new Set(
    plannerDocument.placements.map((placement) => placement.plantDefinitionId),
  );

  return plantDefinitions
    .filter((plant) => referencedPlantIds.has(plant.id))
    .map((plant) => plantDefinitionSchema.parse(plant));
};

const collectReferencedJournalEntries = (
  plannerDocument: PlannerDocument,
  journalEntries: GardenJournalEntry[],
) =>
  journalEntries
    .filter((entry) => entry.gardenPlanId === plannerDocument.plan.id)
    .map((entry) => gardenJournalEntrySchema.parse(entry));

const collectReferencedSeasonalTasks = (
  plannerDocument: PlannerDocument,
  seasonalTasks: SeasonalTask[],
) =>
  seasonalTasks
    .filter((task) => task.gardenPlanId === plannerDocument.plan.id)
    .map((task) => seasonalTaskSchema.parse(task));

export const serializePlannerDocument = (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[] = [],
  journalEntries: GardenJournalEntry[] = [],
  seasonalTasks: SeasonalTask[] = [],
) =>
  JSON.stringify(
    {
      app: plannerDocumentExportApp,
      kind: plannerDocumentExportKind,
      version: plannerDocumentExportVersion,
      exportedAt: new Date().toISOString(),
      document: plannerDocumentSchema.parse(plannerDocument),
      plantDefinitions: collectReferencedPlantDefinitions(
        plannerDocument,
        plantDefinitions,
      ),
      journalEntries: collectReferencedJournalEntries(
        plannerDocument,
        journalEntries,
      ),
      seasonalTasks: collectReferencedSeasonalTasks(
        plannerDocument,
        seasonalTasks,
      ),
    },
    null,
    2,
  );

const unwrapPlannerDocumentExport = (
  parsed: unknown,
): PlannerDocumentImportBundle => {
  if (!parsed || typeof parsed !== 'object') {
    return {
      document: plannerDocumentSchema.parse(parsed),
      plantDefinitions: [],
      journalEntries: [],
      seasonalTasks: [],
    };
  }

  if (
    !('app' in parsed) &&
    !('kind' in parsed) &&
    !('version' in parsed) &&
    !('document' in parsed) &&
    !('plantDefinitions' in parsed)
  ) {
    return {
      document: plannerDocumentSchema.parse(parsed),
      plantDefinitions: [],
      journalEntries: [],
      seasonalTasks: [],
    };
  }

  const envelope = plannerDocumentExportEnvelopeSchema.parse(parsed);

  if (envelope.version !== plannerDocumentExportVersion) {
    throw new Error(
      `Unsupported GardenGnome export version ${envelope.version}.`,
    );
  }

  return {
    document: envelope.document,
    plantDefinitions: envelope.plantDefinitions,
    journalEntries: envelope.journalEntries,
    seasonalTasks: envelope.seasonalTasks,
  };
};

export const parsePlannerDocumentBundle = (raw: string): PlannerDocumentImportBundle => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('The selected file is not a valid JSON file.');
  }

  try {
    return unwrapPlannerDocumentExport(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const detail = firstIssue ? ` ${firstIssue.path.join('.')}: ${firstIssue.message}` : '';

      throw new Error(
        `The selected file is not a valid GardenGnome plan document.${detail}`,
      );
    }

    throw error;
  }
};

export const parsePlannerDocument = (raw: string): PlannerDocument =>
  parsePlannerDocumentBundle(raw).document;

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

export const exportPlannerDocument = async (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[] = [],
  journalEntries: GardenJournalEntry[] = [],
  seasonalTasks: SeasonalTask[] = [],
) => {
  const payload = serializePlannerDocument(
    plannerDocument,
    plantDefinitions,
    journalEntries,
    seasonalTasks,
  );

  if (isTauri()) {
    const target = await save({
      defaultPath: formatPlanFilename(plannerDocument),
      filters: [{ name: 'GardenGnome Plan', extensions: ['json'] }],
    });

    if (!target) {
      return;
    }

    await writeTextFile(target, payload);
    return;
  }

  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = formatPlanFilename(plannerDocument);
  anchor.click();
  URL.revokeObjectURL(url);
};

export const importPlannerDocument = async (): Promise<PlannerDocumentImportBundle | null> => {
  const raw = isTauri()
    ? await (async () => {
        const source = await open({
          multiple: false,
          filters: [{ name: 'GardenGnome Plan', extensions: ['json'] }],
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

  return parsePlannerDocumentBundle(raw);
};
