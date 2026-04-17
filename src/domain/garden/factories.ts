import { defaultCellSizeMm } from '@/domain/garden/defaults';
import { getZoneBounds, rectanglesOverlap } from '@/domain/geometry/geometry';
import type {
  GardenPlan,
  GrowableZoneType,
  GardenZone,
  LayoutPattern,
  MeasurementSystem,
  PlannerDocument,
  PlantPlacement,
  ZoneType,
} from '@/domain/garden/models';
import { zonePresets } from '@/domain/garden/presets';
import { defaultSunProfile } from '@/domain/garden/sun';
import type { PlantDefinition } from '@/domain/plants/models';
import { makeId } from '@/utils/id';

export type PlacementLayoutPattern = LayoutPattern;

export interface CreatePlacementLayoutOptions {
  layoutPattern?: PlacementLayoutPattern;
  count?: number;
}

export interface CreatePlanInput {
  name: string;
  locationLabel: string;
  notes?: string;
  widthCells: number;
  heightCells: number;
  cellSizeMm?: number;
  measurementSystem?: MeasurementSystem;
  seasonTag?: string | null;
}

const now = () => new Date().toISOString();

export const createPlannerDocument = (
  input: CreatePlanInput,
  timestamp = now(),
): PlannerDocument => {
  const planId = makeId('plan');
  const plan: GardenPlan = {
    id: planId,
    name: input.name.trim(),
    locationLabel: input.locationLabel.trim(),
    notes: input.notes?.trim() ?? '',
    measurementSystem: input.measurementSystem ?? 'imperial',
    widthCells: input.widthCells,
    heightCells: input.heightCells,
    cellSizeMm: input.cellSizeMm ?? defaultCellSizeMm,
    seasonTag: input.seasonTag ?? null,
    seasonFamilyId: planId,
    sourcePlanId: null,
    sunProfile: structuredClone(defaultSunProfile),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    plan,
    zones: [],
    placements: [],
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createZone = (
  gardenPlanId: string,
  planWidthCells: number,
  planHeightCells: number,
  zoneType: ZoneType,
  gridX: number,
  gridY: number,
  timestamp = now(),
): GardenZone => {
  const preset = zonePresets[zoneType];
  const maxX = Math.max(0, planWidthCells - preset.widthCells);
  const maxY = Math.max(0, planHeightCells - preset.heightCells);

  return {
    id: makeId('zone'),
    gardenPlanId,
    type: zoneType,
    shape: preset.shape,
    name: preset.label,
    notes: '',
    gridX: clamp(gridX, 0, maxX),
    gridY: clamp(gridY, 0, maxY),
    widthCells: preset.widthCells,
    heightCells: preset.heightCells,
    rotationDegrees: 0,
    styleKey: preset.styleKey,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const growableZoneTypes = new Set<GrowableZoneType>([
  'raisedBed',
  'inGroundBed',
  'container',
  'herbSpiral',
  'trellis',
  'orchardPerennial',
  'greenhouseZone',
  'decorativePlantingArea',
]);

const isGrowableZoneType = (zoneType: ZoneType): zoneType is GrowableZoneType =>
  growableZoneTypes.has(zoneType as GrowableZoneType);

export const findGrowableZoneId = (
  zones: GardenZone[],
  gridX: number,
  gridY: number,
  footprintWidthCells: number,
  footprintHeightCells: number,
) => {
  const right = gridX + footprintWidthCells;
  const bottom = gridY + footprintHeightCells;

  return (
    zones.find(
      (zone) =>
        isGrowableZoneType(zone.type) &&
        gridX >= zone.gridX &&
        gridY >= zone.gridY &&
        right <= zone.gridX + zone.widthCells &&
        bottom <= zone.gridY + zone.heightCells,
    )?.id ?? null
  );
};

export const createPlacement = (
  document: PlannerDocument,
  plantDefinition: PlantDefinition,
  gridX: number,
  gridY: number,
  layoutPattern: PlacementLayoutPattern = 'single',
  timestamp = now(),
): PlantPlacement =>
  createPlacementLayout(
    document,
    plantDefinition,
    gridX,
    gridY,
    { layoutPattern, count: 1 },
    timestamp,
  )[0];

const normalizePlacementCount = (count?: number) =>
  Math.max(1, Math.min(12, Math.round(count ?? 1)));

const buildPlacementOffsets = (
  layoutPattern: PlacementLayoutPattern,
  count: number,
  footprintWidthCells: number,
  footprintHeightCells: number,
) => {
  if (layoutPattern === 'single') {
    return [{ offsetX: 0, offsetY: 0 }];
  }

  if (layoutPattern === 'row') {
    return Array.from({ length: count }, (_, index) => ({
      offsetX: index * footprintWidthCells,
      offsetY: 0,
    }));
  }

  const columns = Math.ceil(Math.sqrt(count));

  return Array.from({ length: count }, (_, index) => ({
    offsetX: (index % columns) * footprintWidthCells,
    offsetY: Math.floor(index / columns) * footprintHeightCells,
  }));
};

const getLayoutBounds = (
  offsets: Array<{ offsetX: number; offsetY: number }>,
  footprintWidthCells: number,
  footprintHeightCells: number,
) => {
  const maxOffsetX = Math.max(...offsets.map((offset) => offset.offsetX));
  const maxOffsetY = Math.max(...offsets.map((offset) => offset.offsetY));

  return {
    widthCells: maxOffsetX + footprintWidthCells,
    heightCells: maxOffsetY + footprintHeightCells,
  };
};

const getPlacementBounds = ({
  gridX,
  gridY,
  footprintWidthCells,
  footprintHeightCells,
}: Pick<
  PlantPlacement,
  'gridX' | 'gridY' | 'footprintWidthCells' | 'footprintHeightCells'
>) => ({
  left: gridX,
  top: gridY,
  right: gridX + footprintWidthCells,
  bottom: gridY + footprintHeightCells,
});

const createFilledZonePlacements = (
  document: PlannerDocument,
  plantDefinition: PlantDefinition,
  gridX: number,
  gridY: number,
  footprintCells: number,
  timestamp: string,
): PlantPlacement[] => {
  const zone = document.zones.find(
    (entry) =>
      isGrowableZoneType(entry.type) &&
      gridX >= entry.gridX &&
      gridY >= entry.gridY &&
      gridX < entry.gridX + entry.widthCells &&
      gridY < entry.gridY + entry.heightCells,
  );

  if (!zone) {
    return [];
  }

  const zoneBounds = getZoneBounds(zone);
  const placements: PlantPlacement[] = [];
  const occupiedBounds = document.placements.map(getPlacementBounds);

  for (
    let placementY = zoneBounds.top;
    placementY + footprintCells <= zoneBounds.bottom;
    placementY += footprintCells
  ) {
    for (
      let placementX = zoneBounds.left;
      placementX + footprintCells <= zoneBounds.right;
      placementX += footprintCells
    ) {
      const candidateBounds = {
        left: placementX,
        top: placementY,
        right: placementX + footprintCells,
        bottom: placementY + footprintCells,
      };

      if (
        occupiedBounds.some((bounds) => rectanglesOverlap(bounds, candidateBounds)) ||
        placements.some((placement) =>
          rectanglesOverlap(getPlacementBounds(placement), candidateBounds),
        )
      ) {
        continue;
      }

      placements.push({
        id: makeId('placement'),
        gardenPlanId: document.plan.id,
        plantDefinitionId: plantDefinition.id,
        zoneId: zone.id,
        notes: '',
        gridX: placementX,
        gridY: placementY,
        footprintWidthCells: footprintCells,
        footprintHeightCells: footprintCells,
        quantity: 1,
        layoutPattern: 'fill',
        rotationDegrees: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return placements;
};

export const createPlacementLayout = (
  document: PlannerDocument,
  plantDefinition: PlantDefinition,
  gridX: number,
  gridY: number,
  options: CreatePlacementLayoutOptions = {},
  timestamp = now(),
): PlantPlacement[] => {
  const footprintCells = Math.max(
    1,
    Math.round(plantDefinition.spacingMm / document.plan.cellSizeMm),
  );
  const layoutPattern = options.layoutPattern ?? 'single';

  if (layoutPattern === 'fill') {
    return createFilledZonePlacements(
      document,
      plantDefinition,
      gridX,
      gridY,
      footprintCells,
      timestamp,
    );
  }

  const count = normalizePlacementCount(
    layoutPattern === 'single' ? 1 : options.count,
  );
  const offsets = buildPlacementOffsets(
    layoutPattern,
    count,
    footprintCells,
    footprintCells,
  );
  const layoutBounds = getLayoutBounds(offsets, footprintCells, footprintCells);
  const maxX = Math.max(0, document.plan.widthCells - layoutBounds.widthCells);
  const maxY = Math.max(0, document.plan.heightCells - layoutBounds.heightCells);
  const clampedX = clamp(gridX, 0, maxX);
  const clampedY = clamp(gridY, 0, maxY);

  return offsets.map(({ offsetX, offsetY }) => {
    const placementX = clampedX + offsetX;
    const placementY = clampedY + offsetY;

    return {
      id: makeId('placement'),
      gardenPlanId: document.plan.id,
      plantDefinitionId: plantDefinition.id,
      zoneId: findGrowableZoneId(
        document.zones,
        placementX,
        placementY,
        footprintCells,
        footprintCells,
      ),
      notes: '',
      gridX: placementX,
      gridY: placementY,
      footprintWidthCells: footprintCells,
      footprintHeightCells: footprintCells,
      quantity: 1,
      layoutPattern,
      rotationDegrees: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
};
