import { createZone } from '@/domain/garden/factories';
import type {
  PlannerDocument,
  ShapeType,
  ZoneType,
} from '@/domain/garden/models';

interface GardenTemplateZone {
  type: ZoneType;
  name?: string;
  notes?: string;
  gridX: number;
  gridY: number;
  widthCells?: number;
  heightCells?: number;
  rotationDegrees?: 0 | 90 | 180 | 270;
  shape?: ShapeType;
  styleKey?: string;
}

export interface GardenTemplateDefinition {
  id: GardenTemplateId;
  label: string;
  description: string;
  widthCells: number;
  heightCells: number;
  suggestedLocationLabel: string;
  suggestedNotes: string;
  zones: GardenTemplateZone[];
}

export type GardenTemplateId =
  | 'raised-bed-starter'
  | 'patio-containers'
  | 'backyard-mix';

export const gardenTemplates: GardenTemplateDefinition[] = [
  {
    id: 'raised-bed-starter',
    label: 'Raised Bed Starter',
    description: 'Two production beds with a central service lane for a fast kitchen-garden setup.',
    widthCells: 18,
    heightCells: 12,
    suggestedLocationLabel: 'Backyard beds',
    suggestedNotes:
      'Starter raised bed layout with two production beds and a clear working path.',
    zones: [
      {
        type: 'raisedBed',
        name: 'North Bed',
        gridX: 1,
        gridY: 1,
        widthCells: 7,
        heightCells: 3,
      },
      {
        type: 'raisedBed',
        name: 'South Bed',
        gridX: 1,
        gridY: 7,
        widthCells: 7,
        heightCells: 3,
      },
      {
        type: 'pathway',
        name: 'Center Path',
        gridX: 9,
        gridY: 0,
        widthCells: 2,
        heightCells: 12,
      },
    ],
  },
  {
    id: 'patio-containers',
    label: 'Patio Containers',
    description: 'A compact patio layout with clustered containers and a herb spiral anchor.',
    widthCells: 14,
    heightCells: 10,
    suggestedLocationLabel: 'Kitchen patio',
    suggestedNotes:
      'Container-forward starter layout sized for a patio or deck edge.',
    zones: [
      {
        type: 'container',
        name: 'Tomato Pots',
        gridX: 1,
        gridY: 1,
        widthCells: 3,
        heightCells: 3,
      },
      {
        type: 'container',
        name: 'Salad Pots',
        gridX: 5,
        gridY: 1,
        widthCells: 3,
        heightCells: 3,
      },
      {
        type: 'herbSpiral',
        name: 'Patio Spiral',
        gridX: 9,
        gridY: 2,
      },
      {
        type: 'pathway',
        name: 'Walkway',
        gridX: 0,
        gridY: 6,
        widthCells: 14,
        heightCells: 2,
      },
    ],
  },
  {
    id: 'backyard-mix',
    label: 'Backyard Mix',
    description: 'A broader backyard starter with beds, perennial space, and a greenhouse pocket.',
    widthCells: 24,
    heightCells: 16,
    suggestedLocationLabel: 'Backyard',
    suggestedNotes:
      'Mixed-use starter plan balancing annual production with perennial and protected space.',
    zones: [
      {
        type: 'raisedBed',
        name: 'Kitchen Bed',
        gridX: 1,
        gridY: 1,
        widthCells: 6,
        heightCells: 3,
      },
      {
        type: 'inGroundBed',
        name: 'Main Patch',
        gridX: 1,
        gridY: 6,
        widthCells: 8,
        heightCells: 5,
      },
      {
        type: 'orchardPerennial',
        name: 'Perennial Edge',
        gridX: 12,
        gridY: 1,
        widthCells: 8,
        heightCells: 4,
      },
      {
        type: 'greenhouseZone',
        name: 'Greenhouse',
        gridX: 14,
        gridY: 8,
      },
      {
        type: 'pathway',
        name: 'Main Walk',
        gridX: 10,
        gridY: 0,
        widthCells: 2,
        heightCells: 16,
      },
    ],
  },
];

export const gardenTemplateMap = Object.fromEntries(
  gardenTemplates.map((template) => [template.id, template]),
) as Record<GardenTemplateId, GardenTemplateDefinition>;

const instantiateTemplateZone = (
  document: PlannerDocument,
  zone: GardenTemplateZone,
  timestamp: string,
) => {
  const seededZone = createZone(
    document.plan.id,
    document.plan.widthCells,
    document.plan.heightCells,
    zone.type,
    zone.gridX,
    zone.gridY,
    timestamp,
  );

  return {
    ...seededZone,
    name: zone.name ?? seededZone.name,
    notes: zone.notes ?? seededZone.notes,
    widthCells: zone.widthCells ?? seededZone.widthCells,
    heightCells: zone.heightCells ?? seededZone.heightCells,
    rotationDegrees: zone.rotationDegrees ?? seededZone.rotationDegrees,
    shape: zone.shape ?? seededZone.shape,
    styleKey: zone.styleKey ?? seededZone.styleKey,
  };
};

export const applyGardenTemplate = (
  document: PlannerDocument,
  templateId: GardenTemplateId,
  timestamp = document.plan.createdAt,
): PlannerDocument => {
  const template = gardenTemplateMap[templateId];

  return {
    ...document,
    plan: {
      ...document.plan,
      notes: document.plan.notes || template.suggestedNotes,
    },
    zones: template.zones.map((zone) => instantiateTemplateZone(document, zone, timestamp)),
    placements: [],
  };
};
