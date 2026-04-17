import type { PlantDefinition } from '@/domain/plants/models';

export const plantingMonthOptions = [
  { value: 1, label: 'January', shortLabel: 'Jan' },
  { value: 2, label: 'February', shortLabel: 'Feb' },
  { value: 3, label: 'March', shortLabel: 'Mar' },
  { value: 4, label: 'April', shortLabel: 'Apr' },
  { value: 5, label: 'May', shortLabel: 'May' },
  { value: 6, label: 'June', shortLabel: 'Jun' },
  { value: 7, label: 'July', shortLabel: 'Jul' },
  { value: 8, label: 'August', shortLabel: 'Aug' },
  { value: 9, label: 'September', shortLabel: 'Sep' },
  { value: 10, label: 'October', shortLabel: 'Oct' },
  { value: 11, label: 'November', shortLabel: 'Nov' },
  { value: 12, label: 'December', shortLabel: 'Dec' },
] as const;

const normalizeMonth = (month: number | null | undefined) => {
  if (!Number.isInteger(month) || month === undefined || month === null) {
    return null;
  }

  return month >= 1 && month <= 12 ? month : null;
};

const resolvePlantingWindow = (plant: PlantDefinition) => {
  const startMonth = normalizeMonth(plant.plantingWindowStartMonth);
  const endMonth = normalizeMonth(plant.plantingWindowEndMonth);

  if (!startMonth && !endMonth) {
    return null;
  }

  return {
    startMonth: startMonth ?? endMonth!,
    endMonth: endMonth ?? startMonth!,
  };
};

export const isPlantInPlantingMonth = (plant: PlantDefinition, month: number) => {
  const targetMonth = normalizeMonth(month);
  const plantingWindow = resolvePlantingWindow(plant);

  if (!targetMonth || !plantingWindow) {
    return false;
  }

  if (plantingWindow.startMonth <= plantingWindow.endMonth) {
    return (
      targetMonth >= plantingWindow.startMonth &&
      targetMonth <= plantingWindow.endMonth
    );
  }

  return (
    targetMonth >= plantingWindow.startMonth ||
    targetMonth <= plantingWindow.endMonth
  );
};

export const formatPlantingWindow = (plant: PlantDefinition) => {
  const plantingWindow = resolvePlantingWindow(plant);

  if (!plantingWindow) {
    return null;
  }

  const start = plantingMonthOptions.find(
    (option) => option.value === plantingWindow.startMonth,
  );
  const end = plantingMonthOptions.find(
    (option) => option.value === plantingWindow.endMonth,
  );

  if (!start || !end) {
    return null;
  }

  return plantingWindow.startMonth === plantingWindow.endMonth
    ? start.shortLabel
    : `${start.shortLabel}-${end.shortLabel}`;
};
