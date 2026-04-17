import { describe, expect, it } from 'vitest';

import type { PlantDefinition } from '@/domain/plants/models';
import {
  formatPlantingWindow,
  isPlantInPlantingMonth,
} from '@/domain/plants/seasonality';

const plant: PlantDefinition = {
  id: 'plant-1',
  commonName: 'Carrot',
  varietyName: 'Nantes',
  category: 'root',
  lifecycle: 'annual',
  spacingMm: 76,
  spreadMm: 76,
  heightMm: 305,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 70,
  plantingWindowStartMonth: 3,
  plantingWindowEndMonth: 8,
  successionIntervalDays: 14,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

describe('plant seasonality helpers', () => {
  it('matches planting windows by month', () => {
    expect(isPlantInPlantingMonth(plant, 4)).toBe(true);
    expect(isPlantInPlantingMonth(plant, 11)).toBe(false);
  });

  it('formats planting windows for display', () => {
    expect(formatPlantingWindow(plant)).toBe('Mar-Aug');
  });
});
