import {
  formatDistanceLabel,
  getZoneBounds,
  rectangleContainsRectangle,
  rectanglesOverlap,
} from '@/domain/geometry/geometry';
import { buildIrrigationRecommendations } from '@/domain/garden/irrigation';
import { zonePresets } from '@/domain/garden/presets';
import type {
  GardenZone,
  GrowableZoneType,
  PlannerDocument,
  PlantPlacement,
  ValidationIssue,
} from '@/domain/garden/models';
import { getDominantSunExposure } from '@/domain/garden/sun';
import { growablePlantZoneTypes } from '@/domain/plants/compatibility';
import type { PlantDefinition } from '@/domain/plants/models';

const growableZoneTypes = new Set<GrowableZoneType>(growablePlantZoneTypes);
const isGrowableZoneType = (
  zoneType: GardenZone['type'],
): zoneType is GrowableZoneType => growableZoneTypes.has(zoneType as GrowableZoneType);
const normalizePlantName = (name: string) => name.trim().toLowerCase();
const formatList = (items: string[]) => {
  if (items.length <= 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    return `${items[0]} or ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, or ${items.at(-1)}`;
};
const formatPreferredZoneTypeList = (
  zoneTypes: NonNullable<PlantDefinition['preferredZoneTypes']>,
) =>
  formatList(
    zoneTypes.map((zoneType) => zonePresets[zoneType].label.toLowerCase()),
  );

const buildZoneOverlapIssues = (zones: GardenZone[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  for (let leftIndex = 0; leftIndex < zones.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < zones.length; rightIndex += 1) {
      const leftZone = zones[leftIndex];
      const rightZone = zones[rightIndex];

      if (!leftZone || !rightZone) {
        continue;
      }

      if (rectanglesOverlap(getZoneBounds(leftZone), getZoneBounds(rightZone))) {
        issues.push({
          code: 'zone-overlap',
          severity: 'warning',
          message: `${leftZone.name} overlaps ${rightZone.name}.`,
          entityIds: [leftZone.id, rightZone.id],
        });
      }
    }
  }

  return issues;
};

const buildPlantOutsideZoneIssues = (
  placements: PlantPlacement[],
  zones: GardenZone[],
): ValidationIssue[] => {
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));

  return placements.flatMap((placement) => {
    if (!placement.zoneId) {
      return [];
    }

    const zone = zoneMap.get(placement.zoneId);

    if (!zone || !isGrowableZoneType(zone.type)) {
      return [
        {
          code: 'plant-outside-zone',
          severity: 'warning',
          message: 'Plant placement is not assigned to a growable zone.',
          entityIds: [placement.id, placement.zoneId],
        },
      ];
    }

    const placementBounds = {
      left: placement.gridX,
      top: placement.gridY,
      right: placement.gridX + placement.footprintWidthCells,
      bottom: placement.gridY + placement.footprintHeightCells,
    };

    if (!rectangleContainsRectangle(getZoneBounds(zone), placementBounds)) {
      return [
        {
          code: 'plant-outside-zone',
          severity: 'warning',
          message: `${zone.name} does not fully contain this plant footprint.`,
          entityIds: [placement.id, zone.id],
        },
      ];
    }

    return [];
  });
};

const getPlacementBounds = (placement: PlantPlacement) => ({
  left: placement.gridX,
  top: placement.gridY,
  right: placement.gridX + placement.footprintWidthCells,
  bottom: placement.gridY + placement.footprintHeightCells,
});

const getPlacementCenterMm = (
  placement: PlantPlacement,
  cellSizeMm: number,
) => ({
  x: (placement.gridX + placement.footprintWidthCells / 2) * cellSizeMm,
  y: (placement.gridY + placement.footprintHeightCells / 2) * cellSizeMm,
});

const buildPlantSpacingIssues = (
  plan: PlannerDocument['plan'],
  placements: PlantPlacement[],
  plantDefinitions: PlantDefinition[],
) => {
  const issues: ValidationIssue[] = [];
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const leftPlacement = placements[leftIndex];
      const rightPlacement = placements[rightIndex];

      if (!leftPlacement || !rightPlacement) {
        continue;
      }

      const leftPlant = plantMap.get(leftPlacement.plantDefinitionId);
      const rightPlant = plantMap.get(rightPlacement.plantDefinitionId);
      const leftBounds = getPlacementBounds(leftPlacement);
      const rightBounds = getPlacementBounds(rightPlacement);
      const overlaps = rectanglesOverlap(leftBounds, rightBounds);

      if (!leftPlant || !rightPlant) {
        if (overlaps) {
          issues.push({
            code: 'plant-spacing',
            severity: 'warning',
            message: `${leftPlant?.commonName ?? 'Plant'} is too close to ${
              rightPlant?.commonName ?? 'another plant'
            }.`,
            entityIds: [leftPlacement.id, rightPlacement.id],
          });
        }

        continue;
      }

      const leftCenter = getPlacementCenterMm(leftPlacement, plan.cellSizeMm);
      const rightCenter = getPlacementCenterMm(rightPlacement, plan.cellSizeMm);
      const actualSpacingMm = Math.hypot(
        rightCenter.x - leftCenter.x,
        rightCenter.y - leftCenter.y,
      );
      const requiredSpacingMm = Math.max(
        leftPlant.spacingMm,
        rightPlant.spacingMm,
      );

      if (actualSpacingMm < requiredSpacingMm) {
        const plantLabel =
          leftPlant.commonName === rightPlant.commonName
            ? `${leftPlant.commonName} placements`
            : `${leftPlant.commonName} and ${rightPlant.commonName}`;

        issues.push({
          code: 'plant-spacing',
          severity: 'warning',
          message: `${plantLabel} are about ${formatDistanceLabel(
            actualSpacingMm,
            plan.measurementSystem,
          )} apart, tighter than the recommended spacing of ${formatDistanceLabel(
            requiredSpacingMm,
            plan.measurementSystem,
          )}.`,
          entityIds: [leftPlacement.id, rightPlacement.id],
        });
      }
    }
  }

  return issues;
};

const buildPlantConflictIssues = (
  placements: PlantPlacement[],
  zones: GardenZone[],
  plantDefinitions: PlantDefinition[],
) => {
  const issues: ValidationIssue[] = [];
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const leftPlacement = placements[leftIndex];
      const rightPlacement = placements[rightIndex];

      if (
        !leftPlacement ||
        !rightPlacement ||
        !leftPlacement.zoneId ||
        leftPlacement.zoneId !== rightPlacement.zoneId
      ) {
        continue;
      }

      const zone = zoneMap.get(leftPlacement.zoneId);
      const leftPlant = plantMap.get(leftPlacement.plantDefinitionId);
      const rightPlant = plantMap.get(rightPlacement.plantDefinitionId);

      if (!zone || !leftPlant || !rightPlant || !isGrowableZoneType(zone.type)) {
        continue;
      }

      const leftConflicts = new Set(
        (leftPlant.conflictPlantNames ?? []).map(normalizePlantName),
      );
      const rightConflicts = new Set(
        (rightPlant.conflictPlantNames ?? []).map(normalizePlantName),
      );

      if (
        !leftConflicts.has(normalizePlantName(rightPlant.commonName)) &&
        !rightConflicts.has(normalizePlantName(leftPlant.commonName))
      ) {
        continue;
      }

      issues.push({
        code: 'plant-conflict',
        severity: 'warning',
        message: `${leftPlant.commonName} and ${rightPlant.commonName} are marked as a conflicting pairing in ${zone.name}.`,
        entityIds: [leftPlacement.id, rightPlacement.id, zone.id],
      });
    }
  }

  return issues;
};

const buildZoneCompatibilityIssues = (
  plan: PlannerDocument['plan'],
  placements: PlantPlacement[],
  zones: GardenZone[],
  plantDefinitions: PlantDefinition[],
) => {
  const issues: ValidationIssue[] = [];
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  placements.forEach((placement) => {
    if (!placement.zoneId) {
      return;
    }

    const zone = zoneMap.get(placement.zoneId);
    const plant = plantMap.get(placement.plantDefinitionId);

    if (!zone || !plant || !isGrowableZoneType(zone.type)) {
      return;
    }

    const preferredZoneTypes = plant.preferredZoneTypes ?? [];
    const zoneType = zone.type;

    if (
      preferredZoneTypes.length > 0 &&
      !preferredZoneTypes.includes(zoneType)
    ) {
      issues.push({
        code: 'zone-compatibility',
        severity: 'warning',
        message: `${plant.commonName} is a stronger fit for ${formatPreferredZoneTypeList(
          preferredZoneTypes,
        )} than ${zone.name}.`,
        entityIds: [placement.id, zone.id],
      });
    } else {
      if (zone.type === 'herbSpiral' && !new Set(['herb', 'flower']).has(plant.category)) {
        issues.push({
          code: 'zone-compatibility',
          severity: 'warning',
          message: `${plant.commonName} is a weak fit for ${zone.name}; herb spirals work best for herbs and compact flowers.`,
          entityIds: [placement.id, zone.id],
        });
      }

      if (zone.type === 'trellis' && !new Set(['fruiting', 'perennial']).has(plant.category)) {
        issues.push({
          code: 'zone-compatibility',
          severity: 'warning',
          message: `${plant.commonName} is a weak fit for ${zone.name}; trellises work best for fruiting crops and other vertical growers.`,
          entityIds: [placement.id, zone.id],
        });
      }

      if (zone.type === 'orchardPerennial' && plant.lifecycle !== 'perennial') {
        issues.push({
          code: 'zone-compatibility',
          severity: 'warning',
          message: `${plant.commonName} is a weak fit for ${zone.name}; orchard zones work best for perennial crops.`,
          entityIds: [placement.id, zone.id],
        });
      }

      if (
        zone.type === 'decorativePlantingArea' &&
        !new Set(['flower', 'herb', 'perennial']).has(plant.category)
      ) {
        issues.push({
          code: 'zone-compatibility',
          severity: 'warning',
          message: `${plant.commonName} is a weak fit for ${zone.name}; decorative zones work best for flowers, herbs, and perennial accents.`,
          entityIds: [placement.id, zone.id],
        });
      }
    }

    if (
      zone.type === 'container' &&
      placement.footprintWidthCells * placement.footprintHeightCells >
        (zone.widthCells * zone.heightCells) / 2
    ) {
      issues.push({
        code: 'zone-compatibility',
        severity: 'warning',
        message: `${plant.commonName} may outgrow ${zone.name} at this spacing.`,
        entityIds: [placement.id, zone.id],
      });
    }

    const dominantExposure = getDominantSunExposure(plan, getPlacementBounds(placement));

    if (
      plant.sunRequirement === 'fullSun' &&
      dominantExposure &&
      dominantExposure !== 'fullSun'
    ) {
      issues.push({
        code: 'zone-compatibility',
        severity: 'warning',
        message: `${plant.commonName} prefers full sun but this footprint sits mostly in ${
          dominantExposure === 'partSun' ? 'part sun' : 'shade'
        }.`,
        entityIds: [placement.id],
      });
    }

    if (plant.sunRequirement === 'partSun' && dominantExposure === 'shade') {
      issues.push({
        code: 'zone-compatibility',
        severity: 'warning',
        message: `${plant.commonName} prefers part sun but this footprint sits mostly in shade.`,
        entityIds: [placement.id],
      });
    }

    if (plant.sunRequirement === 'shade' && dominantExposure === 'fullSun') {
      issues.push({
        code: 'zone-compatibility',
        severity: 'warning',
        message: `${plant.commonName} prefers shade but this footprint sits mostly in full sun.`,
        entityIds: [placement.id],
      });
    }
  });

  return issues;
};

const buildIrrigationBalanceIssues = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const placementIdsByZone = new Map<string, string[]>();

  document.placements.forEach((placement) => {
    if (!placement.zoneId) {
      return;
    }

    placementIdsByZone.set(placement.zoneId, [
      ...(placementIdsByZone.get(placement.zoneId) ?? []),
      placement.id,
    ]);
  });

  return buildIrrigationRecommendations(document, plantDefinitions)
    .filter((recommendation) => recommendation.waterProfile === 'mixed')
    .map<ValidationIssue>((recommendation) => ({
      code: 'irrigation-balance',
      severity: 'warning',
      message: `${recommendation.zoneName} mixes crops with different water needs. ${recommendation.cadenceLabel}.`,
      entityIds: [
        recommendation.zoneId,
        ...(placementIdsByZone.get(recommendation.zoneId) ?? []),
      ],
    }));
};

export const validatePlannerDocument = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => [
  ...buildZoneOverlapIssues(document.zones),
  ...buildPlantSpacingIssues(document.plan, document.placements, plantDefinitions),
  ...buildPlantOutsideZoneIssues(document.placements, document.zones),
  ...buildPlantConflictIssues(document.placements, document.zones, plantDefinitions),
  ...buildZoneCompatibilityIssues(
    document.plan,
    document.placements,
    document.zones,
    plantDefinitions,
  ),
  ...buildIrrigationBalanceIssues(document, plantDefinitions),
];
