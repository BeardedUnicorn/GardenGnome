import { describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import {
  createPlacement,
  createPlacementLayout,
  createPlannerDocument,
} from '@/domain/garden/factories';
import type { PlantDefinition } from '@/domain/plants/models';

const compactBasil: PlantDefinition = {
  id: 'plant-basil',
  commonName: 'Basil',
  varietyName: 'Genovese',
  category: 'herb',
  lifecycle: 'annual',
  spacingMm: 305,
  spreadMm: 305,
  heightMm: 457,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 50,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

const tomato: PlantDefinition = {
  id: 'plant-tomato',
  commonName: 'Tomato',
  varietyName: 'Sun Gold',
  category: 'fruiting',
  lifecycle: 'annual',
  spacingMm: 610,
  spreadMm: 610,
  heightMm: 1524,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 65,
  notes: '',
  isFavorite: true,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

const document: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 12,
    heightCells: 10,
    cellSizeMm: 305,
    seasonTag: '2026',
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [
    {
      id: 'zone-1',
      gardenPlanId: 'plan-1',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'South Bed',
      notes: '',
      gridX: 0,
      gridY: 0,
      widthCells: 12,
      heightCells: 8,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
  placements: [],
};

describe('createPlacementLayout', () => {
  it('assigns a default sun profile when a new plan is created', () => {
    const plannerDocument = createPlannerDocument({
      name: 'Backyard Beds',
      locationLabel: 'South fence',
      widthCells: 16,
      heightCells: 10,
    });

    expect(plannerDocument.plan).toMatchObject({
      sunProfile: {
        shadeEdge: 'north',
        shadeDepthCells: 2,
        partShadeDepthCells: 4,
      },
    });
  });

  it('creates a row layout that clamps to the plan bounds', () => {
    const placements = createPlacementLayout(document, tomato, 10, 2, {
      layoutPattern: 'row',
      count: 3,
    });

    expect(placements).toHaveLength(3);
    expect(placements.map((placement) => placement.gridX)).toEqual([6, 8, 10]);
    expect(placements.map((placement) => placement.gridY)).toEqual([2, 2, 2]);
    expect(placements.every((placement) => placement.zoneId === 'zone-1')).toBe(true);
    expect(placements.every((placement) => placement.layoutPattern === 'row')).toBe(true);
  });

  it('creates a compact cluster layout from the requested count', () => {
    const placements = createPlacementLayout(document, compactBasil, 10, 9, {
      layoutPattern: 'cluster',
      count: 5,
    });

    expect(placements).toHaveLength(5);
    expect(placements.map((placement) => [placement.gridX, placement.gridY])).toEqual([
      [9, 8],
      [10, 8],
      [11, 8],
      [9, 9],
      [10, 9],
    ]);
    expect(placements.every((placement) => placement.layoutPattern === 'cluster')).toBe(true);
  });

  it('fills a growable zone with placements based on crop spacing', () => {
    const placements = createPlacementLayout(document, tomato, 1, 1, {
      layoutPattern: 'fill',
    });

    expect(placements).toHaveLength(24);
    expect(placements[0]).toMatchObject({ gridX: 0, gridY: 0, zoneId: 'zone-1' });
    expect(placements.at(-1)).toMatchObject({ gridX: 10, gridY: 6, zoneId: 'zone-1' });
    expect(placements.every((placement) => placement.layoutPattern === 'fill')).toBe(true);
  });

  it('treats trellis and orchard zones as growable placement targets', () => {
    const mixedZoneDocument: PlannerDocument = {
      ...document,
      zones: [
        {
          ...document.zones[0],
          id: 'zone-trellis',
          type: 'trellis',
          name: 'South Trellis',
          widthCells: 2,
          heightCells: 4,
          styleKey: 'trellis',
        },
        {
          ...document.zones[0],
          id: 'zone-orchard',
          type: 'orchardPerennial',
          name: 'Orchard Block',
          gridX: 4,
          widthCells: 4,
          heightCells: 4,
          styleKey: 'orchard-perennial',
        },
      ],
    };

    const trellisPlacement = createPlacement(mixedZoneDocument, tomato, 0, 0);
    const orchardPlacement = createPlacement(mixedZoneDocument, compactBasil, 4, 0);

    expect(trellisPlacement.zoneId).toBe('zone-trellis');
    expect(orchardPlacement.zoneId).toBe('zone-orchard');
  });

  it('skips already occupied footprints when filling a growable zone', () => {
    const partiallyFilledDocument: PlannerDocument = {
      ...document,
      plan: {
        ...document.plan,
        widthCells: 4,
        heightCells: 2,
      },
      zones: [
        {
          ...document.zones[0],
          widthCells: 4,
          heightCells: 2,
        },
      ],
      placements: [
        {
          id: 'placement-existing',
          gardenPlanId: 'plan-1',
          plantDefinitionId: compactBasil.id,
          zoneId: 'zone-1',
          notes: '',
          gridX: 1,
          gridY: 0,
          footprintWidthCells: 1,
          footprintHeightCells: 1,
          quantity: 1,
          layoutPattern: 'single',
          rotationDegrees: 0,
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    };

    const placements = createPlacementLayout(partiallyFilledDocument, compactBasil, 0, 0, {
      layoutPattern: 'fill',
    });

    expect(placements).toHaveLength(7);
    expect(placements.some((placement) => placement.gridX === 1 && placement.gridY === 0)).toBe(
      false,
    );
  });

  it('keeps single placement behavior as a convenience wrapper', () => {
    const placement = createPlacement(document, compactBasil, 3, 4);

    expect(placement.gridX).toBe(3);
    expect(placement.gridY).toBe(4);
    expect(placement.layoutPattern).toBe('single');
    expect(placement.zoneId).toBe('zone-1');
  });
});
