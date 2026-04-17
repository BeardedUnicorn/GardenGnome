export type MeasurementSystem = 'imperial' | 'metric';
export type SunShadeEdge = 'north' | 'east' | 'south' | 'west';

export interface SunProfile {
  shadeEdge: SunShadeEdge;
  shadeDepthCells: number;
  partShadeDepthCells: number;
}

export type ZoneType =
  | 'raisedBed'
  | 'inGroundBed'
  | 'container'
  | 'herbSpiral'
  | 'trellis'
  | 'orchardPerennial'
  | 'greenhouseZone'
  | 'decorativePlantingArea'
  | 'compostArea'
  | 'pathway';

export type GrowableZoneType = Exclude<ZoneType, 'pathway' | 'compostArea'>;

export type ShapeType = 'rectangle' | 'circle';

export type LayoutPattern = 'single' | 'row' | 'cluster' | 'fill';

export type ValidationCode =
  | 'zone-overlap'
  | 'plant-outside-zone'
  | 'plant-spacing'
  | 'plant-conflict'
  | 'zone-compatibility'
  | 'irrigation-balance';

export type ValidationSeverity = 'warning' | 'error';

export interface GardenPlan {
  id: string;
  name: string;
  locationLabel: string;
  notes: string;
  measurementSystem: MeasurementSystem;
  widthCells: number;
  heightCells: number;
  cellSizeMm: number;
  seasonTag: string | null;
  seasonFamilyId?: string | null;
  sourcePlanId?: string | null;
  sunProfile?: SunProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface GridSpec {
  widthCells: number;
  heightCells: number;
  cellSizeMm: number;
  measurementSystem: MeasurementSystem;
}

export interface GardenPlanSummary {
  id: string;
  name: string;
  locationLabel: string;
  measurementSystem: MeasurementSystem;
  widthCells: number;
  heightCells: number;
  cellSizeMm: number;
  seasonTag: string | null;
  seasonFamilyId?: string | null;
  sourcePlanId?: string | null;
  updatedAt: string;
}

export interface GardenZone {
  id: string;
  gardenPlanId: string;
  type: ZoneType;
  shape: ShapeType;
  name: string;
  notes: string;
  gridX: number;
  gridY: number;
  widthCells: number;
  heightCells: number;
  rotationDegrees: 0 | 90 | 180 | 270;
  styleKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlantPlacement {
  id: string;
  gardenPlanId: string;
  plantDefinitionId: string;
  zoneId: string | null;
  notes: string;
  gridX: number;
  gridY: number;
  footprintWidthCells: number;
  footprintHeightCells: number;
  quantity: number;
  layoutPattern: LayoutPattern;
  rotationDegrees: 0 | 90 | 180 | 270;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerDocument {
  plan: GardenPlan;
  zones: GardenZone[];
  placements: PlantPlacement[];
}

export interface GardenJournalEntry {
  id: string;
  gardenPlanId: string;
  title: string;
  body: string;
  observedOn: string;
  createdAt: string;
  updatedAt: string;
}

export type SeasonalTaskKind = 'plant' | 'watch' | 'succession' | 'harvest' | 'task';
export type SeasonalTaskStatus = 'pending' | 'done' | 'skipped';

export interface SeasonalTask {
  id: string;
  gardenPlanId: string;
  plantDefinitionId: string | null;
  placementId: string | null;
  sourceKey: string | null;
  kind: SeasonalTaskKind;
  status: SeasonalTaskStatus;
  dueMonth: number | null;
  title: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  measurementSystem: MeasurementSystem;
  defaultCellSizeMm: number;
  theme: string;
  autosaveEnabled: boolean;
  autosaveIntervalSeconds: number;
  showGrid: boolean;
  updatedAt: string;
}

export interface ValidationIssue {
  code: ValidationCode;
  severity: ValidationSeverity;
  message: string;
  entityIds: string[];
}
