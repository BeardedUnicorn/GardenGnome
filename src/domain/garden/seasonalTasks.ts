import type { PlannerDocument, SeasonalTask } from '@/domain/garden/models';
import {
  buildHarvestNote,
  buildHarvestTitle,
  estimateHarvestMonth,
  getMonthLabel,
} from '@/domain/garden/harvest';
import type { PlantDefinition } from '@/domain/plants/models';
import {
  formatPlantingWindow,
  isPlantInPlantingMonth,
} from '@/domain/plants/seasonality';

export type GeneratedSeasonalTask = Pick<
  SeasonalTask,
  | 'plantDefinitionId'
  | 'placementId'
  | 'sourceKey'
  | 'kind'
  | 'dueMonth'
  | 'title'
  | 'note'
>;

const kindOrder: Record<SeasonalTask['kind'], number> = {
  plant: 0,
  succession: 1,
  harvest: 2,
  task: 3,
  watch: 4,
};

const statusOrder: Record<SeasonalTask['status'], number> = {
  pending: 0,
  done: 1,
  skipped: 2,
};

const formatPlantLabel = (plant: PlantDefinition) =>
  plant.varietyName?.trim()
    ? `${plant.commonName} · ${plant.varietyName.trim()}`
    : plant.commonName;

export const makeSeasonalTaskId = (gardenPlanId: string, sourceKey: string) =>
  `seasonal-task-${gardenPlanId}-${sourceKey}`;

export const sortSeasonalTasks = (tasks: SeasonalTask[]) =>
  [...tasks].sort(
    (left, right) =>
      statusOrder[left.status] - statusOrder[right.status] ||
      (left.dueMonth ?? Number.MAX_SAFE_INTEGER) -
        (right.dueMonth ?? Number.MAX_SAFE_INTEGER) ||
      kindOrder[left.kind] - kindOrder[right.kind] ||
      left.title.localeCompare(right.title),
  );

export const buildGeneratedSeasonalTasks = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
  referenceMonth: number,
): GeneratedSeasonalTask[] => {
  const referenceMonthLabel = getMonthLabel(referenceMonth);
  const placedPlantIds = [
    ...new Set(document.placements.map((placement) => placement.plantDefinitionId)),
  ];
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  return placedPlantIds
    .flatMap<GeneratedSeasonalTask>((plantId) => {
      const plant = plantMap.get(plantId);

      if (!plant) {
        return [];
      }

      const plantLabel = formatPlantLabel(plant);
      const plantingWindow = formatPlantingWindow(plant);
      const inPlantingWindow = plantingWindow
        ? isPlantInPlantingMonth(plant, referenceMonth)
        : false;
      const tasks: GeneratedSeasonalTask[] = [];

      if (plantingWindow) {
        tasks.push(
          inPlantingWindow
            ? {
                plantDefinitionId: plant.id,
                placementId: null,
                sourceKey: `${plant.id}-window-open`,
                kind: 'plant',
                dueMonth: referenceMonth,
                title: `Plant ${plant.commonName} now`,
                note: `${plantLabel} is in its ${referenceMonthLabel} planting window.`,
              }
            : {
                plantDefinitionId: plant.id,
                placementId: null,
                sourceKey: `${plant.id}-window-closed`,
                kind: 'watch',
                dueMonth:
                  plant.plantingWindowStartMonth ?? plant.plantingWindowEndMonth ?? null,
                title:
                  plant.sunRequirement === 'fullSun'
                    ? `Hold ${plant.commonName} for warmer weather`
                    : `Watch ${plant.commonName}'s timing`,
                note: `${plantLabel} usually starts in ${plantingWindow}, not ${referenceMonthLabel}.`,
              },
        );
      }

      if (plant.successionIntervalDays && (inPlantingWindow || !plantingWindow)) {
        tasks.push({
          plantDefinitionId: plant.id,
          placementId: null,
          sourceKey: `${plant.id}-succession`,
          kind: 'succession',
          dueMonth: referenceMonth,
          title: `Succession sow ${plant.commonName}`,
          note: `${plantLabel} can be re-sown every ${plant.successionIntervalDays} days while the planting window stays open.`,
        });
      }

      const estimatedHarvestMonth = estimateHarvestMonth(plant);

      if (estimatedHarvestMonth) {
        tasks.push({
          plantDefinitionId: plant.id,
          placementId: null,
          sourceKey: `${plant.id}-harvest`,
          kind: 'harvest',
          dueMonth: estimatedHarvestMonth,
          title: buildHarvestTitle(plant, estimatedHarvestMonth, referenceMonth),
          note: buildHarvestNote(plant, estimatedHarvestMonth),
        });
      }

      return tasks;
    })
    .sort(
      (left, right) =>
        (left.dueMonth ?? Number.MAX_SAFE_INTEGER) -
          (right.dueMonth ?? Number.MAX_SAFE_INTEGER) ||
        kindOrder[left.kind] - kindOrder[right.kind] ||
        left.title.localeCompare(right.title),
    );
};
