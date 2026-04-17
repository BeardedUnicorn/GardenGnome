import { z } from 'zod';

import { normalizeSunProfile } from '@/domain/garden/sun';

const measurementSystemSchema = z.enum(['imperial', 'metric']);
const sunShadeEdgeSchema = z.enum(['north', 'east', 'south', 'west']);
const zoneTypeSchema = z.enum([
  'raisedBed',
  'inGroundBed',
  'container',
  'herbSpiral',
  'trellis',
  'orchardPerennial',
  'greenhouseZone',
  'decorativePlantingArea',
  'compostArea',
  'pathway',
]);
const shapeTypeSchema = z.enum(['rectangle', 'circle']);
const layoutPatternSchema = z.enum(['single', 'row', 'cluster', 'fill']);
const seasonalTaskKindSchema = z.enum(['plant', 'watch', 'succession', 'harvest', 'task']);
const seasonalTaskStatusSchema = z.enum(['pending', 'done', 'skipped']);
const rotationDegreesSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);
const identifierSchema = z.string().trim().min(1);
const timestampSchema = z.string().trim().min(1);
const nonNegativeIntegerSchema = z.number().int().min(0);
const positiveIntegerSchema = z.number().int().min(1);
const monthSchema = z.number().int().min(1).max(12);
const sunProfileSchema = z.object({
  shadeEdge: sunShadeEdgeSchema,
  shadeDepthCells: nonNegativeIntegerSchema,
  partShadeDepthCells: nonNegativeIntegerSchema,
});
export const appSettingsSchema = z.object({
  measurementSystem: measurementSystemSchema,
  defaultCellSizeMm: positiveIntegerSchema,
  theme: z.string().trim().min(1),
  autosaveEnabled: z.boolean(),
  autosaveIntervalSeconds: positiveIntegerSchema,
  showGrid: z.boolean(),
  updatedAt: timestampSchema,
});

export const gardenPlanSchema = z
  .object({
    id: identifierSchema,
    name: z.string().trim().min(1),
    locationLabel: z.string(),
    notes: z.string(),
    measurementSystem: measurementSystemSchema,
    widthCells: positiveIntegerSchema,
    heightCells: positiveIntegerSchema,
    cellSizeMm: positiveIntegerSchema,
    seasonTag: z.string().trim().min(1).nullable(),
    seasonFamilyId: identifierSchema.nullish(),
    sourcePlanId: identifierSchema.nullish(),
    sunProfile: sunProfileSchema.nullish(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .transform((plan) => ({
    ...plan,
    seasonFamilyId: plan.seasonFamilyId ?? plan.id,
    sourcePlanId: plan.sourcePlanId ?? null,
    sunProfile: normalizeSunProfile(plan.sunProfile, plan.widthCells, plan.heightCells),
  }));

export const gardenZoneSchema = z.object({
  id: identifierSchema,
  gardenPlanId: identifierSchema,
  type: zoneTypeSchema,
  shape: shapeTypeSchema,
  name: z.string().trim().min(1),
  notes: z.string(),
  gridX: nonNegativeIntegerSchema,
  gridY: nonNegativeIntegerSchema,
  widthCells: positiveIntegerSchema,
  heightCells: positiveIntegerSchema,
  rotationDegrees: rotationDegreesSchema,
  styleKey: z.string().trim().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const plantPlacementSchema = z.object({
  id: identifierSchema,
  gardenPlanId: identifierSchema,
  plantDefinitionId: identifierSchema,
  zoneId: identifierSchema.nullable(),
  notes: z.string(),
  gridX: nonNegativeIntegerSchema,
  gridY: nonNegativeIntegerSchema,
  footprintWidthCells: positiveIntegerSchema,
  footprintHeightCells: positiveIntegerSchema,
  quantity: positiveIntegerSchema,
  layoutPattern: layoutPatternSchema,
  rotationDegrees: rotationDegreesSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const gardenJournalEntrySchema = z.object({
  id: identifierSchema,
  gardenPlanId: identifierSchema,
  title: z.string().trim().min(1),
  body: z.string(),
  observedOn: z.string().trim().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const seasonalTaskSchema = z.object({
  id: identifierSchema,
  gardenPlanId: identifierSchema,
  plantDefinitionId: identifierSchema.nullable(),
  placementId: identifierSchema.nullable(),
  sourceKey: z.string().trim().min(1).nullable(),
  kind: seasonalTaskKindSchema,
  status: seasonalTaskStatusSchema,
  dueMonth: monthSchema.nullish().transform((month) => month ?? null),
  title: z.string().trim().min(1),
  note: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const plannerDocumentSchema = z
  .object({
    plan: gardenPlanSchema,
    zones: z.array(gardenZoneSchema),
    placements: z.array(plantPlacementSchema),
  })
  .superRefine((document, ctx) => {
    const zoneIds = new Set<string>();
    const placementIds = new Set<string>();

    document.zones.forEach((zone, index) => {
      if (zone.gardenPlanId !== document.plan.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zones', index, 'gardenPlanId'],
          message: 'Zone gardenPlanId must match plan.id.',
        });
      }

      if (zoneIds.has(zone.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zones', index, 'id'],
          message: 'Zone ids must be unique within a planner document.',
        });
      }

      zoneIds.add(zone.id);
    });

    document.placements.forEach((placement, index) => {
      if (placement.gardenPlanId !== document.plan.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['placements', index, 'gardenPlanId'],
          message: 'Plant placement gardenPlanId must match plan.id.',
        });
      }

      if (placement.zoneId && !zoneIds.has(placement.zoneId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['placements', index, 'zoneId'],
          message: 'Plant placement zoneId must reference an existing zone.',
        });
      }

      if (placementIds.has(placement.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['placements', index, 'id'],
          message: 'Plant placement ids must be unique within a planner document.',
        });
      }

      placementIds.add(placement.id);
    });
  });
