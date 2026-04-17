import type {
  GardenPlanSummary,
  PlannerDocument,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';

const trailingYearPattern = /\s+\b(19|20)\d{2}\b$/;
const trailingCopyPattern = /\s+Copy$/i;

const normalizePlanFamilyName = (planName: string) =>
  planName
    .trim()
    .replace(trailingCopyPattern, '')
    .replace(trailingYearPattern, '')
    .trim();

const parseSeasonYear = (value: string | null) => {
  if (!value) {
    return null;
  }

  const yearMatch = value.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? Number.parseInt(yearMatch[0], 10) : null;
};

const compareSeasonPlans = (left: GardenPlanSummary, right: GardenPlanSummary) => {
  const leftYear = parseSeasonYear(left.seasonTag) ?? parseSeasonYear(left.name);
  const rightYear = parseSeasonYear(right.seasonTag) ?? parseSeasonYear(right.name);

  if (leftYear !== null && rightYear !== null && leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  if (left.seasonTag !== right.seasonTag) {
    return (left.seasonTag ?? '').localeCompare(right.seasonTag ?? '');
  }

  return left.updatedAt.localeCompare(right.updatedAt);
};

const formatPlantLabel = (plantDefinitionId: string, plantMap: Map<string, PlantDefinition>) => {
  const plant = plantMap.get(plantDefinitionId);

  if (!plant) {
    return plantDefinitionId;
  }

  return plant.varietyName
    ? `${plant.commonName} · ${plant.varietyName}`
    : plant.commonName;
};

const collectCropLabels = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  return new Set(
    document.placements.map((placement) =>
      formatPlantLabel(placement.plantDefinitionId, plantMap),
    ),
  );
};

const collectPlantFamilies = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  return new Set(
    document.placements
      .map((placement) => plantMap.get(placement.plantDefinitionId)?.plantFamily?.trim())
      .filter((family): family is string => Boolean(family)),
  );
};

export interface SeasonFamilyContext {
  familyName: string;
  current: GardenPlanSummary;
  previous: GardenPlanSummary | null;
  next: GardenPlanSummary | null;
  seasons: GardenPlanSummary[];
}

export interface SeasonFamilySummary {
  familyId: string;
  familyName: string;
  locationLabel: string;
  latest: GardenPlanSummary;
  seasons: GardenPlanSummary[];
}

export interface RotationSnapshot {
  repeatedCrops: string[];
  repeatedFamilies: string[];
  addedCrops: string[];
  retiredCrops: string[];
}

export interface RotationGuidance {
  key: 'repeat-family' | 'repeat-crop';
  title: string;
  note: string;
}

export interface SeasonZoneChange {
  key: string;
  zoneName: string;
  currentZoneId: string | null;
  comparisonZoneId: string | null;
  status: 'added' | 'removed' | 'changed';
  note: string;
  addedCrops: string[];
  removedCrops: string[];
}

export interface SeasonCropChange {
  key: string;
  cropLabel: string;
  currentPlantDefinitionId: string | null;
  status: 'added' | 'removed' | 'moved' | 'changed';
  note: string;
  currentZones: string[];
  comparisonZones: string[];
}

export interface SeasonPlanComparison {
  zoneChanges: SeasonZoneChange[];
  cropChanges: SeasonCropChange[];
}

const unassignedZoneLabel = 'Unassigned plantings';

const normalizeLookupValue = (value: string) => value.trim().toLowerCase();

const sortLabels = (labels: string[]) =>
  [...labels].sort((left, right) => left.localeCompare(right));

const uniqueSortedLabels = (labels: string[]) =>
  sortLabels([...new Set(labels.filter(Boolean))]);

const diffLabels = (left: string[], right: string[]) =>
  left.filter((label) => !right.includes(label));

const formatLabelList = (labels: string[]) => {
  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0]!;
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
};

const formatZoneFootprint = (zone: PlannerDocument['zones'][number]) =>
  `${zone.widthCells} × ${zone.heightCells} cells`;

const collectZoneCropLabels = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));
  const labelsByZoneId = new Map<string, string[]>();

  document.placements.forEach((placement) => {
    if (!placement.zoneId) {
      return;
    }

    const nextLabels = labelsByZoneId.get(placement.zoneId) ?? [];
    nextLabels.push(formatPlantLabel(placement.plantDefinitionId, plantMap));
    labelsByZoneId.set(placement.zoneId, nextLabels);
  });

  return new Map(
    [...labelsByZoneId.entries()].map(([zoneId, labels]) => [
      zoneId,
      uniqueSortedLabels(labels),
    ]),
  );
};

const collectCropZoneSummary = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));
  const zoneNameById = new Map(document.zones.map((zone) => [zone.id, zone.name]));
  const summary = new Map<
    string,
    {
      plantDefinitionIds: string[];
      zoneNames: string[];
      placementCount: number;
    }
  >();

  document.placements.forEach((placement) => {
    const cropLabel = formatPlantLabel(placement.plantDefinitionId, plantMap);
    const current = summary.get(cropLabel) ?? {
      plantDefinitionIds: [],
      zoneNames: [],
      placementCount: 0,
    };

    current.plantDefinitionIds.push(placement.plantDefinitionId);
    current.zoneNames.push(zoneNameById.get(placement.zoneId ?? '') ?? unassignedZoneLabel);
    current.placementCount += 1;
    summary.set(cropLabel, current);
  });

  return new Map(
    [...summary.entries()].map(([cropLabel, value]) => [
      cropLabel,
      {
        plantDefinitionIds: [...new Set(value.plantDefinitionIds)],
        zoneNames: uniqueSortedLabels(value.zoneNames),
        placementCount: value.placementCount,
      },
    ]),
  );
};

const resolvePlantDefinitionId = (plantDefinitionIds: string[]) =>
  plantDefinitionIds.length === 1 ? plantDefinitionIds[0]! : null;

const hasLinkedLineage = (
  planSummaries: GardenPlanSummary[],
  current: GardenPlanSummary,
) =>
  Boolean(
    current.seasonFamilyId &&
      (current.sourcePlanId ||
        planSummaries.some(
          (plan) =>
            plan.id !== current.id && plan.seasonFamilyId === current.seasonFamilyId,
        )),
  );

const resolveSeasonFamilyKey = (
  planSummaries: GardenPlanSummary[],
  plan: GardenPlanSummary,
) => {
  if (hasLinkedLineage(planSummaries, plan) && plan.seasonFamilyId) {
    return `lineage:${plan.seasonFamilyId}`;
  }

  return `inferred:${normalizePlanFamilyName(plan.name)}::${plan.locationLabel}`;
};

const collectSeasonFamilyPlans = (
  planSummaries: GardenPlanSummary[],
  current: GardenPlanSummary,
) =>
  planSummaries
    .filter(
      (plan) =>
        resolveSeasonFamilyKey(planSummaries, plan) ===
        resolveSeasonFamilyKey(planSummaries, current),
    )
    .sort(compareSeasonPlans);

export const listSeasonFamilies = (planSummaries: GardenPlanSummary[]) =>
  [...new Map(
    planSummaries.map((plan) => [
      resolveSeasonFamilyKey(planSummaries, plan),
      collectSeasonFamilyPlans(planSummaries, plan),
    ]),
  ).entries()]
    .map(([, seasons]) => {
      const latest = seasons.at(-1)!;

      return {
        familyId:
          latest.seasonFamilyId ??
          `${normalizePlanFamilyName(latest.name)}:${latest.locationLabel}`,
        familyName: normalizePlanFamilyName(seasons[0]?.name ?? latest.name),
        locationLabel: latest.locationLabel,
        latest,
        seasons,
      };
    })
    .sort((left, right) => right.latest.updatedAt.localeCompare(left.latest.updatedAt));

export const getSeasonFamilyContext = (
  planSummaries: GardenPlanSummary[],
  currentPlanId: string,
): SeasonFamilyContext | null => {
  const current = planSummaries.find((plan) => plan.id === currentPlanId);

  if (!current) {
    return null;
  }

  const seasons = collectSeasonFamilyPlans(planSummaries, current);
  const currentIndex = seasons.findIndex((plan) => plan.id === currentPlanId);

  if (currentIndex === -1) {
    return null;
  }

  return {
    familyName: normalizePlanFamilyName(seasons[0]?.name ?? current.name),
    current: seasons[currentIndex]!,
    previous: seasons[currentIndex - 1] ?? null,
    next: seasons[currentIndex + 1] ?? null,
    seasons,
  };
};

export const buildRotationSnapshot = (
  currentDocument: PlannerDocument,
  previousDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[],
): RotationSnapshot => {
  const currentCrops = collectCropLabels(currentDocument, plantDefinitions);
  const previousCrops = collectCropLabels(previousDocument, plantDefinitions);
  const currentFamilies = collectPlantFamilies(currentDocument, plantDefinitions);
  const previousFamilies = collectPlantFamilies(previousDocument, plantDefinitions);

  const repeatedCrops = [...currentCrops]
    .filter((crop) => previousCrops.has(crop))
    .sort((left, right) => left.localeCompare(right));
  const repeatedFamilies = [...currentFamilies]
    .filter((family) => previousFamilies.has(family))
    .sort((left, right) => left.localeCompare(right));
  const addedCrops = [...currentCrops]
    .filter((crop) => !previousCrops.has(crop))
    .sort((left, right) => left.localeCompare(right));
  const retiredCrops = [...previousCrops]
    .filter((crop) => !currentCrops.has(crop))
    .sort((left, right) => left.localeCompare(right));

  return {
    repeatedCrops,
    repeatedFamilies,
    addedCrops,
    retiredCrops,
  };
};

export const buildRotationGuidance = (
  snapshot: RotationSnapshot,
): RotationGuidance[] => {
  const guidance: RotationGuidance[] = [];

  if (snapshot.repeatedFamilies.length > 0) {
    guidance.push({
      key: 'repeat-family',
      title: 'Rotate repeated families',
      note: `${snapshot.repeatedFamilies.join(', ')} repeats from the previous saved season. Move that family to a different bed or give this area a rest next season.`,
    });
  }

  if (snapshot.repeatedCrops.length > 0) {
    guidance.push({
      key: 'repeat-crop',
      title: 'Avoid direct repeats',
      note: `${snapshot.repeatedCrops.join(', ')} repeats from the previous saved season. Replanting the same crop in place can compound pest and disease pressure.`,
    });
  }

  return guidance;
};

export const buildSeasonPlanComparison = (
  currentDocument: PlannerDocument,
  comparisonDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[],
): SeasonPlanComparison => {
  const currentZones = new Map(
    currentDocument.zones.map((zone) => [normalizeLookupValue(zone.name), zone]),
  );
  const comparisonZones = new Map(
    comparisonDocument.zones.map((zone) => [normalizeLookupValue(zone.name), zone]),
  );
  const currentZoneCropLabels = collectZoneCropLabels(currentDocument, plantDefinitions);
  const comparisonZoneCropLabels = collectZoneCropLabels(comparisonDocument, plantDefinitions);
  const zoneKeys = uniqueSortedLabels([
    ...currentZones.keys(),
    ...comparisonZones.keys(),
  ]);

  const zoneChanges = zoneKeys.flatMap<SeasonZoneChange>((zoneKey) => {
    const currentZone = currentZones.get(zoneKey);
    const comparisonZone = comparisonZones.get(zoneKey);

    if (!currentZone && !comparisonZone) {
      return [];
    }

    const currentCrops =
      currentZone ? currentZoneCropLabels.get(currentZone.id) ?? [] : [];
    const comparisonCrops =
      comparisonZone ? comparisonZoneCropLabels.get(comparisonZone.id) ?? [] : [];

    if (currentZone && !comparisonZone) {
      const note = [
        `Added zone this season: ${currentZone.name}.`,
        currentCrops.length > 0 ? `Current crops: ${formatLabelList(currentCrops)}.` : null,
      ]
        .filter(Boolean)
        .join(' ');

      return [
        {
          key: `zone:${zoneKey}:added`,
          zoneName: currentZone.name,
          currentZoneId: currentZone.id,
          comparisonZoneId: null,
          status: 'added',
          note,
          addedCrops: currentCrops,
          removedCrops: [],
        },
      ];
    }

    if (!currentZone && comparisonZone) {
      const note = [
        `Removed zone from this season: ${comparisonZone.name}.`,
        comparisonCrops.length > 0
          ? `Previous crops: ${formatLabelList(comparisonCrops)}.`
          : null,
      ]
        .filter(Boolean)
        .join(' ');

      return [
        {
          key: `zone:${zoneKey}:removed`,
          zoneName: comparisonZone.name,
          currentZoneId: null,
          comparisonZoneId: comparisonZone.id,
          status: 'removed',
          note,
          addedCrops: [],
          removedCrops: comparisonCrops,
        },
      ];
    }

    const addedCrops = diffLabels(currentCrops, comparisonCrops);
    const removedCrops = diffLabels(comparisonCrops, currentCrops);
    const footprintChanged =
      currentZone!.gridX !== comparisonZone!.gridX ||
      currentZone!.gridY !== comparisonZone!.gridY ||
      currentZone!.widthCells !== comparisonZone!.widthCells ||
      currentZone!.heightCells !== comparisonZone!.heightCells ||
      currentZone!.type !== comparisonZone!.type ||
      currentZone!.shape !== comparisonZone!.shape ||
      currentZone!.rotationDegrees !== comparisonZone!.rotationDegrees;

    if (!footprintChanged && addedCrops.length === 0 && removedCrops.length === 0) {
      return [];
    }

    const note = [
      footprintChanged
        ? `Footprint changed from ${formatZoneFootprint(comparisonZone!)} to ${formatZoneFootprint(
            currentZone!,
          )}.`
        : null,
      addedCrops.length > 0 ? `Added crops: ${formatLabelList(addedCrops)}.` : null,
      removedCrops.length > 0 ? `Removed crops: ${formatLabelList(removedCrops)}.` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return [
      {
        key: `zone:${zoneKey}:changed`,
        zoneName: currentZone!.name,
        currentZoneId: currentZone!.id,
        comparisonZoneId: comparisonZone!.id,
        status: 'changed',
        note,
        addedCrops,
        removedCrops,
      },
    ];
  });

  const currentCropSummary = collectCropZoneSummary(currentDocument, plantDefinitions);
  const comparisonCropSummary = collectCropZoneSummary(comparisonDocument, plantDefinitions);
  const cropLabels = uniqueSortedLabels([
    ...currentCropSummary.keys(),
    ...comparisonCropSummary.keys(),
  ]);

  const cropChanges = cropLabels.flatMap<SeasonCropChange>((cropLabel) => {
    const current = currentCropSummary.get(cropLabel);
    const comparison = comparisonCropSummary.get(cropLabel);

    if (!current && !comparison) {
      return [];
    }

    if (current && !comparison) {
      return [
        {
          key: `crop:${normalizeLookupValue(cropLabel)}:added`,
          cropLabel,
          currentPlantDefinitionId: resolvePlantDefinitionId(current.plantDefinitionIds),
          status: 'added',
          note: `Added ${cropLabel} in ${formatLabelList(current.zoneNames)}.`,
          currentZones: current.zoneNames,
          comparisonZones: [],
        },
      ];
    }

    if (!current && comparison) {
      return [
        {
          key: `crop:${normalizeLookupValue(cropLabel)}:removed`,
          cropLabel,
          currentPlantDefinitionId: null,
          status: 'removed',
          note: `Removed ${cropLabel} from ${formatLabelList(comparison.zoneNames)}.`,
          currentZones: [],
          comparisonZones: comparison.zoneNames,
        },
      ];
    }

    const sameZones =
      current!.zoneNames.length === comparison!.zoneNames.length &&
      current!.zoneNames.every((zoneName, index) => zoneName === comparison!.zoneNames[index]);

    if (!sameZones) {
      return [
        {
          key: `crop:${normalizeLookupValue(cropLabel)}:moved`,
          cropLabel,
          currentPlantDefinitionId: resolvePlantDefinitionId(current!.plantDefinitionIds),
          status: 'moved',
          note: `${cropLabel} moved from ${formatLabelList(
            comparison!.zoneNames,
          )} to ${formatLabelList(current!.zoneNames)}.`,
          currentZones: current!.zoneNames,
          comparisonZones: comparison!.zoneNames,
        },
      ];
    }

    if (current!.placementCount !== comparison!.placementCount) {
      return [
        {
          key: `crop:${normalizeLookupValue(cropLabel)}:changed`,
          cropLabel,
          currentPlantDefinitionId: resolvePlantDefinitionId(current!.plantDefinitionIds),
          status: 'changed',
          note: `${cropLabel} changed from ${comparison!.placementCount} to ${current!.placementCount} placements in ${formatLabelList(current!.zoneNames)}.`,
          currentZones: current!.zoneNames,
          comparisonZones: comparison!.zoneNames,
        },
      ];
    }

    return [];
  });

  return {
    zoneChanges,
    cropChanges,
  };
};
