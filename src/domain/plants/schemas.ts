import { z } from 'zod';

import {
  normalizePlantReferenceNames,
  normalizePreferredZoneTypes,
} from '@/domain/plants/compatibility';

const plantCategorySchema = z.enum([
  'leafy',
  'root',
  'fruiting',
  'flower',
  'herb',
  'perennial',
]);
const lifecycleSchema = z.enum(['annual', 'perennial', 'biennial']);
const sunRequirementSchema = z.enum(['fullSun', 'partSun', 'shade']);
const waterRequirementSchema = z.enum(['low', 'moderate', 'high']);
const preferredZoneTypeSchema = z.enum([
  'raisedBed',
  'inGroundBed',
  'container',
  'herbSpiral',
  'trellis',
  'orchardPerennial',
  'greenhouseZone',
  'decorativePlantingArea',
]);
const identifierSchema = z.string().trim().min(1);
const timestampSchema = z.string().trim().min(1);
const positiveIntegerSchema = z.number().int().min(1);
const positiveMonthSchema = z.number().int().min(1).max(12);

export const plantDefinitionSchema = z
  .object({
    id: identifierSchema,
    commonName: z.string().trim().min(1),
    varietyName: z.string(),
    plantFamily: z.string().trim().min(1).nullable().optional(),
    category: plantCategorySchema,
    lifecycle: lifecycleSchema,
    spacingMm: positiveIntegerSchema,
    spreadMm: positiveIntegerSchema,
    heightMm: positiveIntegerSchema,
    sunRequirement: sunRequirementSchema,
    waterRequirement: waterRequirementSchema,
    daysToMaturity: positiveIntegerSchema,
    plantingWindowStartMonth: positiveMonthSchema.nullish(),
    plantingWindowEndMonth: positiveMonthSchema.nullish(),
    successionIntervalDays: positiveIntegerSchema.nullish(),
    companionPlantNames: z.array(z.string()).nullish().default([]),
    conflictPlantNames: z.array(z.string()).nullish().default([]),
    preferredZoneTypes: z.array(preferredZoneTypeSchema).nullish().default([]),
    notes: z.string(),
    isFavorite: z.boolean(),
    isCustom: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .transform((plant) => ({
    ...plant,
    plantFamily: plant.plantFamily?.trim() || null,
    plantingWindowStartMonth: plant.plantingWindowStartMonth ?? null,
    plantingWindowEndMonth: plant.plantingWindowEndMonth ?? null,
    successionIntervalDays: plant.successionIntervalDays ?? null,
    companionPlantNames: normalizePlantReferenceNames(plant.companionPlantNames),
    conflictPlantNames: normalizePlantReferenceNames(plant.conflictPlantNames),
    preferredZoneTypes: normalizePreferredZoneTypes(plant.preferredZoneTypes),
  }));
