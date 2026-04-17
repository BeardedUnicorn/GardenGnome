import type {
  GardenZone,
  GrowableZoneType,
  PlannerDocument,
} from '@/domain/garden/models';
import type { PlantDefinition, WaterRequirement } from '@/domain/plants/models';

export type IrrigationWaterProfile = WaterRequirement | 'mixed' | 'unassigned';

export interface IrrigationRecommendation {
  zoneId: string;
  zoneName: string;
  zoneType: GrowableZoneType;
  waterProfile: IrrigationWaterProfile;
  methodLabel: string;
  summaryLabel: string;
  cadenceLabel: string;
}

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

const waterSummaryLabels: Record<IrrigationWaterProfile, string> = {
  low: 'Low water demand',
  moderate: 'Moderate water demand',
  high: 'High water demand',
  mixed: 'Mixed water demand',
  unassigned: 'No crops assigned',
};

const cadenceLabels: Record<IrrigationWaterProfile, string> = {
  low: 'Water 1-2 times weekly',
  moderate: 'Water 2-3 times weekly',
  high: 'Check moisture daily',
  mixed: 'Split into separate watering runs',
  unassigned: 'Set schedule after planting',
};

const irrigationMethodsByZoneType: Record<
  GrowableZoneType,
  Record<IrrigationWaterProfile, string>
> = {
  raisedBed: {
    low: 'Pulse drip',
    moderate: 'Soaker line',
    high: 'Deep drip',
    mixed: 'Zoned drip',
    unassigned: 'Plan drip line',
  },
  inGroundBed: {
    low: 'Pulse drip',
    moderate: 'Soaker line',
    high: 'Deep drip',
    mixed: 'Zoned drip',
    unassigned: 'Plan drip line',
  },
  container: {
    low: 'Container drip',
    moderate: 'Drip ring',
    high: 'Drip ring',
    mixed: 'Dedicated emitters',
    unassigned: 'Plan emitters',
  },
  herbSpiral: {
    low: 'Micro drip loop',
    moderate: 'Micro drip loop',
    high: 'Micro drip loop',
    mixed: 'Micro drip zones',
    unassigned: 'Plan emitters',
  },
  trellis: {
    low: 'Targeted drip',
    moderate: 'Targeted drip',
    high: 'Deep emitter drip',
    mixed: 'Split trellis runs',
    unassigned: 'Plan emitters',
  },
  orchardPerennial: {
    low: 'Deep soak line',
    moderate: 'Root-zone drip',
    high: 'Deep root drip',
    mixed: 'Split orchard loops',
    unassigned: 'Plan orchard drip',
  },
  greenhouseZone: {
    low: 'Bench drip',
    moderate: 'Bench drip',
    high: 'Mister + drip',
    mixed: 'Split greenhouse runs',
    unassigned: 'Plan bench irrigation',
  },
  decorativePlantingArea: {
    low: 'Pulse drip',
    moderate: 'Soaker line',
    high: 'Deep drip',
    mixed: 'Split planting loops',
    unassigned: 'Plan drip line',
  },
};

const getWaterProfile = (
  zone: GardenZone,
  plannerDocument: PlannerDocument,
  plantMap: Map<string, PlantDefinition>,
): IrrigationWaterProfile => {
  const zoneWaterRequirements = plannerDocument.placements
    .filter((placement) => placement.zoneId === zone.id)
    .map((placement) => plantMap.get(placement.plantDefinitionId)?.waterRequirement)
    .filter((requirement): requirement is WaterRequirement => Boolean(requirement));

  if (zoneWaterRequirements.length === 0) {
    return 'unassigned';
  }

  const uniqueRequirements = new Set(zoneWaterRequirements);

  return uniqueRequirements.size === 1
    ? zoneWaterRequirements[0]
    : 'mixed';
};

export const buildIrrigationRecommendations = (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[],
): IrrigationRecommendation[] => {
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  return plannerDocument.zones.flatMap((zone) => {
    if (!growableZoneTypes.has(zone.type as GrowableZoneType)) {
      return [];
    }

    const zoneType = zone.type as GrowableZoneType;
    const waterProfile = getWaterProfile(zone, plannerDocument, plantMap);

    return [
      {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneType,
        waterProfile,
        methodLabel: irrigationMethodsByZoneType[zoneType][waterProfile],
        summaryLabel: waterSummaryLabels[waterProfile],
        cadenceLabel: cadenceLabels[waterProfile],
      },
    ];
  });
};
