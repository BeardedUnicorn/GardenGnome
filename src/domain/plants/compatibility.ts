import type { PlantDefinition, PreferredZoneType } from '@/domain/plants/models';

export const growablePlantZoneTypes: PreferredZoneType[] = [
  'raisedBed',
  'inGroundBed',
  'container',
  'herbSpiral',
  'trellis',
  'orchardPerennial',
  'greenhouseZone',
  'decorativePlantingArea',
];

const growablePlantZoneTypeSet = new Set<PreferredZoneType>(growablePlantZoneTypes);

const normalizeListValue = (value: string) => value.trim().replace(/\s+/g, ' ');

export const normalizePlantReferenceNames = (
  names: readonly (string | null | undefined)[] | null | undefined,
) => {
  const normalizedNames: string[] = [];
  const seen = new Set<string>();

  names?.forEach((name) => {
    if (!name) {
      return;
    }

    const normalizedName = normalizeListValue(name);

    if (!normalizedName) {
      return;
    }

    const key = normalizedName.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalizedNames.push(normalizedName);
  });

  return normalizedNames;
};

export const parsePlantReferenceInput = (value: string) =>
  normalizePlantReferenceNames(value.split(/[,\n]+/));

export const serializePlantReferenceNames = (
  names: readonly (string | null | undefined)[] | null | undefined,
) => normalizePlantReferenceNames(names).join(', ');

export const normalizePreferredZoneTypes = (
  zoneTypes: readonly (PreferredZoneType | string | null | undefined)[] | null | undefined,
) => {
  const normalizedZoneTypes: PreferredZoneType[] = [];
  const seen = new Set<PreferredZoneType>();

  zoneTypes?.forEach((zoneType) => {
    if (!zoneType || !growablePlantZoneTypeSet.has(zoneType as PreferredZoneType)) {
      return;
    }

    const normalizedZoneType = zoneType as PreferredZoneType;

    if (seen.has(normalizedZoneType)) {
      return;
    }

    seen.add(normalizedZoneType);
    normalizedZoneTypes.push(normalizedZoneType);
  });

  return normalizedZoneTypes;
};

export const normalizePlantCompatibility = (
  plant: PlantDefinition,
): PlantDefinition => ({
  ...plant,
  companionPlantNames: normalizePlantReferenceNames(plant.companionPlantNames),
  conflictPlantNames: normalizePlantReferenceNames(plant.conflictPlantNames),
  preferredZoneTypes: normalizePreferredZoneTypes(plant.preferredZoneTypes),
});
