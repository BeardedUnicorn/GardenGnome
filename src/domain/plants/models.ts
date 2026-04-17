import type { GrowableZoneType } from '@/domain/garden/models';

export type PlantCategory =
  | 'leafy'
  | 'root'
  | 'fruiting'
  | 'flower'
  | 'herb'
  | 'perennial';

export type Lifecycle = 'annual' | 'perennial' | 'biennial';
export type SunRequirement = 'fullSun' | 'partSun' | 'shade';
export type WaterRequirement = 'low' | 'moderate' | 'high';
export type PreferredZoneType = GrowableZoneType;

export interface PlantDefinition {
  id: string;
  commonName: string;
  varietyName: string;
  plantFamily?: string | null;
  category: PlantCategory;
  lifecycle: Lifecycle;
  spacingMm: number;
  spreadMm: number;
  heightMm: number;
  sunRequirement: SunRequirement;
  waterRequirement: WaterRequirement;
  daysToMaturity: number;
  plantingWindowStartMonth?: number | null;
  plantingWindowEndMonth?: number | null;
  successionIntervalDays?: number | null;
  companionPlantNames?: string[];
  conflictPlantNames?: string[];
  preferredZoneTypes?: PreferredZoneType[];
  notes: string;
  isFavorite: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}
