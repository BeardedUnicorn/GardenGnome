import type { AppSettings } from '@/domain/garden/models';
import { inchesToMillimeters } from '@/domain/geometry/geometry';

export const defaultCellSizeMm = inchesToMillimeters(12);

export const createDefaultSettings = (updatedAt = new Date().toISOString()): AppSettings => ({
  measurementSystem: 'imperial',
  defaultCellSizeMm,
  theme: 'garden-day',
  autosaveEnabled: true,
  autosaveIntervalSeconds: 2,
  showGrid: true,
  updatedAt,
});
