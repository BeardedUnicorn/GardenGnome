import type { PlantDefinition } from '@/domain/plants/models';
import { plantingMonthOptions } from '@/domain/plants/seasonality';

const formatPlantLabel = (plant: PlantDefinition) =>
  plant.varietyName?.trim()
    ? `${plant.commonName} · ${plant.varietyName.trim()}`
    : plant.commonName;

export const getMonthLabel = (month: number) =>
  plantingMonthOptions.find((option) => option.value === month)?.label ?? 'this month';

export const estimateHarvestMonth = (plant: PlantDefinition) => {
  const plantingStartMonth = plant.plantingWindowStartMonth;

  if (!plantingStartMonth || plant.daysToMaturity <= 0) {
    return null;
  }

  const maturityOffsetMonths = Math.floor((plant.daysToMaturity - 1) / 30);

  return ((plantingStartMonth + maturityOffsetMonths - 1) % 12) + 1;
};

export const buildHarvestTitle = (
  plant: PlantDefinition,
  harvestMonth: number,
  referenceMonth: number,
) =>
  harvestMonth === referenceMonth
    ? `Harvest ${plant.commonName} now`
    : `Harvest ${plant.commonName} in ${getMonthLabel(harvestMonth)}`;

export const buildHarvestNote = (plant: PlantDefinition, harvestMonth: number) =>
  `Based on a ${getMonthLabel(
    plant.plantingWindowStartMonth ?? harvestMonth,
  )} start and ${plant.daysToMaturity} days to maturity, ${formatPlantLabel(
    plant,
  )} should begin harvesting around ${getMonthLabel(harvestMonth)}.`;
