import type { PlannerDocument } from '@/domain/garden/models';
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

export interface SeasonalityGuidance {
  key: string;
  plantDefinitionId: string;
  status: 'inWindow' | 'outOfWindow' | 'succession' | 'harvest';
  dueMonth?: number | null;
  title: string;
  note: string;
}

const formatPlantLabel = (plant: PlantDefinition) =>
  plant.varietyName?.trim()
    ? `${plant.commonName} · ${plant.varietyName.trim()}`
    : plant.commonName;

export const buildSeasonalityGuidance = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
  referenceMonth: number,
): SeasonalityGuidance[] => {
  const referenceMonthLabel = getMonthLabel(referenceMonth);
  const placedPlantIds = [...new Set(document.placements.map((placement) => placement.plantDefinitionId))];
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  return placedPlantIds.flatMap<SeasonalityGuidance>((plantId) => {
    const plant = plantMap.get(plantId);

    if (!plant) {
      return [];
    }

    const plantLabel = formatPlantLabel(plant);
    const windowLabel = formatPlantingWindow(plant);
    const inWindow = windowLabel ? isPlantInPlantingMonth(plant, referenceMonth) : false;
    const guidance: SeasonalityGuidance[] = [];

    if (windowLabel) {
      guidance.push(
        inWindow
          ? {
              key: `${plant.id}-window-open`,
              plantDefinitionId: plant.id,
              status: 'inWindow',
              title: `Plant ${plant.commonName} now`,
              note: `${plantLabel} is in its ${referenceMonthLabel} planting window.`,
            }
          : {
              key: `${plant.id}-window-closed`,
              plantDefinitionId: plant.id,
              status: 'outOfWindow',
              title:
                plant.sunRequirement === 'fullSun'
                  ? `Hold ${plant.commonName} for warmer weather`
                  : `Watch ${plant.commonName}'s timing`,
              note: `${plantLabel} usually starts in ${windowLabel}, not ${referenceMonthLabel}.`,
            },
      );
    }

    if (plant.successionIntervalDays && (inWindow || !windowLabel)) {
      guidance.push({
        key: `${plant.id}-succession`,
        plantDefinitionId: plant.id,
        status: 'succession',
        dueMonth: referenceMonth,
        title: `Succession sow ${plant.commonName}`,
        note: `${plantLabel} can be re-sown every ${plant.successionIntervalDays} days while the planting window stays open.`,
      });
    }

    const estimatedHarvestMonth = estimateHarvestMonth(plant);

    if (estimatedHarvestMonth) {
      guidance.push({
        key: `${plant.id}-harvest`,
        plantDefinitionId: plant.id,
        status: 'harvest',
        dueMonth: estimatedHarvestMonth,
        title: buildHarvestTitle(plant, estimatedHarvestMonth, referenceMonth),
        note: buildHarvestNote(plant, estimatedHarvestMonth),
      });
    }

    return guidance;
  });
};
