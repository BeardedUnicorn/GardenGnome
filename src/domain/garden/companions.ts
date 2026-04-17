import { getZoneBounds } from '@/domain/geometry/geometry';
import {
  buildIrrigationRecommendations,
  type IrrigationWaterProfile,
} from '@/domain/garden/irrigation';
import type {
  GardenZone,
  GrowableZoneType,
  PlannerDocument,
} from '@/domain/garden/models';
import { getDominantSunExposure } from '@/domain/garden/sun';
import { growablePlantZoneTypes } from '@/domain/plants/compatibility';
import type { PlantDefinition, SunRequirement } from '@/domain/plants/models';
import { isPlantInPlantingMonth, plantingMonthOptions } from '@/domain/plants/seasonality';

export interface CompanionSuggestion {
  key: string;
  zoneId: string;
  zoneName: string;
  status: 'paired' | 'suggested';
  title: string;
  plants: string[];
  missingPlantDefinitionId: string | null;
  note: string;
  boundaryNotes: string[];
}
const growableZoneTypes = new Set<GrowableZoneType>(growablePlantZoneTypes);

const sunExposureLabels = {
  fullSun: 'full sun',
  partSun: 'part sun',
  shade: 'shade',
} as const;

const categoryPriority: Record<PlantDefinition['category'], number> = {
  fruiting: 0,
  perennial: 1,
  leafy: 2,
  root: 3,
  herb: 4,
  flower: 5,
};

const normalizePlantName = (name: string) => name.trim().toLowerCase();

const formatPlantName = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1);

const buildPairKey = (leftPlant: PlantDefinition, rightPlant: PlantDefinition) =>
  [leftPlant.commonName, rightPlant.commonName]
    .map(normalizePlantName)
    .sort()
    .join('-');

const rankPlantsForTitle = (plants: PlantDefinition[]) =>
  [...plants].sort(
    (leftPlant, rightPlant) =>
      categoryPriority[leftPlant.category] - categoryPriority[rightPlant.category] ||
      leftPlant.commonName.localeCompare(rightPlant.commonName),
  );

const supportsPreferredZoneType = (
  plant: PlantDefinition,
  zoneType: GrowableZoneType,
) => {
  const preferredZoneTypes = plant.preferredZoneTypes ?? [];

  return preferredZoneTypes.length === 0 || preferredZoneTypes.includes(zoneType);
};

const supportsSunRequirement = (
  exposure: keyof typeof sunExposureLabels | null,
  requirement: SunRequirement,
) => {
  if (!exposure) {
    return true;
  }

  if (requirement === 'fullSun') {
    return exposure === 'fullSun';
  }

  if (requirement === 'partSun') {
    return exposure === 'fullSun' || exposure === 'partSun';
  }

  return exposure === 'partSun' || exposure === 'shade';
};

const getMonthLabel = (month: number) =>
  plantingMonthOptions.find((option) => option.value === month)?.label ?? 'This month';

const buildBoundaryNotes = ({
  zone,
  sunExposure,
  waterProfile,
  presentPlants,
  missingPlants,
  referenceMonth,
}: {
  zone: GardenZone;
  sunExposure: keyof typeof sunExposureLabels | null;
  waterProfile: Exclude<IrrigationWaterProfile, 'mixed' | 'unassigned'>;
  presentPlants: string[];
  missingPlants: string[];
  referenceMonth: number;
}) => [
  `${zone.name} stays mostly ${sunExposure ? sunExposureLabels[sunExposure] : 'sun-compatible'}.`,
  `This zone is running a ${waterProfile} water profile.`,
  missingPlants.length === 0
    ? `${formatPlantList(presentPlants)} already share this growable zone.`
    : missingPlants.length === 1
      ? `${getMonthLabel(referenceMonth)} is inside ${missingPlants[0]} planting window.`
      : `${getMonthLabel(referenceMonth)} fits the planting window for ${formatPlantList(
          missingPlants,
        )}.`,
];

const formatPlantList = (plants: string[]) => {
  if (plants.length <= 1) {
    return plants[0] ?? '';
  }

  if (plants.length === 2) {
    return `${plants[0]} and ${plants[1]}`;
  }

  return `${plants.slice(0, -1).join(', ')}, and ${plants.at(-1)}`;
};

export const buildCompanionSuggestions = (
  document: PlannerDocument,
  plantDefinitions: PlantDefinition[],
  referenceMonth = new Date().getMonth() + 1,
): CompanionSuggestion[] => {
  const plantDefinitionsById = new Map(plantDefinitions.map((plant) => [plant.id, plant]));
  const plantDefinitionsByName = new Map(
    plantDefinitions.map((plant) => [normalizePlantName(plant.commonName), plant]),
  );
  const irrigationByZoneId = new Map(
    buildIrrigationRecommendations(document, plantDefinitions).map((recommendation) => [
      recommendation.zoneId,
      recommendation,
    ]),
  );
  const placementsByZoneId = new Map<string, PlannerDocument['placements']>();
  const emittedSuggestionKeys = new Set<string>();

  document.placements.forEach((placement) => {
    if (!placement.zoneId) {
      return;
    }

    const nextPlacements = placementsByZoneId.get(placement.zoneId) ?? [];
    nextPlacements.push(placement);
    placementsByZoneId.set(placement.zoneId, nextPlacements);
  });

  return document.zones.flatMap<CompanionSuggestion>((zone) => {
    if (!growableZoneTypes.has(zone.type as GrowableZoneType)) {
      return [];
    }

    const zonePlacements = placementsByZoneId.get(zone.id) ?? [];

    if (zonePlacements.length === 0) {
      return [];
    }

    const irrigationRecommendation = irrigationByZoneId.get(zone.id);
    const waterProfile = irrigationRecommendation?.waterProfile;

    if (
      !irrigationRecommendation ||
      !waterProfile ||
      waterProfile === 'mixed' ||
      waterProfile === 'unassigned'
    ) {
      return [];
    }

    const zonePlantNames = new Set(
      zonePlacements
        .map((placement) => plantDefinitionsById.get(placement.plantDefinitionId))
        .filter((plant): plant is PlantDefinition => Boolean(plant))
        .map((plant) => normalizePlantName(plant.commonName)),
    );
    const zonePlantDefinitions = Array.from(
      new Map(
        zonePlacements
          .map((placement) => plantDefinitionsById.get(placement.plantDefinitionId))
          .filter((plant): plant is PlantDefinition => Boolean(plant))
          .map((plant) => [normalizePlantName(plant.commonName), plant]),
      ).values(),
    );
    const zoneSunExposure = getDominantSunExposure(document.plan, getZoneBounds(zone));

    return zonePlantDefinitions.flatMap<CompanionSuggestion>((plant) => {
      const normalizedCompanionNames = (plant.companionPlantNames ?? []).map(normalizePlantName);

      return normalizedCompanionNames.flatMap<CompanionSuggestion>((companionName) => {
        const companionPlant = plantDefinitionsByName.get(companionName);

        if (!companionPlant) {
          return [];
        }

        const growableZoneType = zone.type as GrowableZoneType;

        if (
          !supportsPreferredZoneType(plant, growableZoneType) ||
          !supportsPreferredZoneType(companionPlant, growableZoneType)
        ) {
          return [];
        }

        const pairPlants = [plant, companionPlant];

        if (
          !pairPlants.every((candidatePlant) =>
            supportsSunRequirement(zoneSunExposure, candidatePlant.sunRequirement),
          )
        ) {
          return [];
        }

        const pairKey = buildPairKey(plant, companionPlant);
        const companionPresent = zonePlantNames.has(companionName);
        const suggestionKey = companionPresent
          ? `${pairKey}:zone:${zone.id}`
          : `${pairKey}:zone:${zone.id}:missing:${companionName}`;

        if (emittedSuggestionKeys.has(suggestionKey)) {
          return [];
        }

        if (!companionPresent && !isPlantInPlantingMonth(companionPlant, referenceMonth)) {
          return [];
        }

        emittedSuggestionKeys.add(suggestionKey);

        const rankedPlants = rankPlantsForTitle(pairPlants);
        const boundaryNotes = buildBoundaryNotes({
          zone,
          sunExposure: zoneSunExposure,
          waterProfile,
          presentPlants: companionPresent
            ? [plant.commonName, companionPlant.commonName]
            : [plant.commonName],
          missingPlants: companionPresent ? [] : [companionPlant.commonName],
          referenceMonth,
        });

        if (companionPresent) {
          return [
            {
              key: suggestionKey,
              zoneId: zone.id,
              zoneName: zone.name,
              status: 'paired',
              title: `${rankedPlants[0]?.commonName ?? formatPlantName(plant.commonName)} + ${
                rankedPlants[1]?.commonName ?? formatPlantName(companionPlant.commonName)
              }`,
              plants: rankedPlants.map((candidatePlant) => candidatePlant.commonName),
              missingPlantDefinitionId: null,
              note: `${rankedPlants[0]?.commonName ?? plant.commonName} and ${
                rankedPlants[1]?.commonName ?? companionPlant.commonName
              } are marked as companion plants in your library.`,
              boundaryNotes,
            },
          ];
        }

        return [
          {
            key: suggestionKey,
            zoneId: zone.id,
            zoneName: zone.name,
            status: 'suggested',
            title: `Add ${companionPlant.commonName} near ${plant.commonName}`,
            plants: [plant.commonName, companionPlant.commonName],
            missingPlantDefinitionId: companionPlant.id,
            note: `Consider adding ${companionPlant.commonName} near ${plant.commonName}. ${companionPlant.commonName} is marked as a companion plant for ${plant.commonName} in your library.`,
            boundaryNotes,
          },
        ];
      });
    });
  });
};
