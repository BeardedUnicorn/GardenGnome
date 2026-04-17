import { describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import { validatePlannerDocument } from '@/domain/garden/validation';
import type { PlantDefinition } from '@/domain/plants/models';

const withCompatibility = (
  plant: PlantDefinition,
  compatibility: {
    companionPlantNames?: string[];
    conflictPlantNames?: string[];
    preferredZoneTypes?: string[];
  } = {},
) =>
  ({
    ...plant,
    companionPlantNames: [],
    conflictPlantNames: [],
    preferredZoneTypes: [],
    ...compatibility,
  }) as PlantDefinition;

const tomato: PlantDefinition = withCompatibility({
  id: 'plant-1',
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
}, {
  preferredZoneTypes: ['raisedBed', 'inGroundBed', 'trellis'],
});

const lettuce: PlantDefinition = withCompatibility({
  id: 'plant-2',
  commonName: 'Lettuce',
  varietyName: 'Little Gem',
  category: 'leafy',
  lifecycle: 'annual',
  spacingMm: 305,
  spreadMm: 305,
  heightMm: 254,
  sunRequirement: 'shade',
  waterRequirement: 'moderate',
  daysToMaturity: 45,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  preferredZoneTypes: ['raisedBed', 'inGroundBed', 'container'],
});

const pepper: PlantDefinition = withCompatibility({
  id: 'plant-3',
  commonName: 'Pepper',
  varietyName: 'Shishito',
  category: 'fruiting',
  lifecycle: 'annual',
  spacingMm: 400,
  spreadMm: 400,
  heightMm: 762,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 70,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  preferredZoneTypes: ['raisedBed', 'inGroundBed', 'container'],
});

const thyme: PlantDefinition = withCompatibility({
  id: 'plant-4',
  commonName: 'Thyme',
  varietyName: 'English',
  category: 'herb',
  lifecycle: 'perennial',
  spacingMm: 254,
  spreadMm: 254,
  heightMm: 203,
  sunRequirement: 'fullSun',
  waterRequirement: 'low',
  daysToMaturity: 85,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  companionPlantNames: ['Carrot', 'Kale'],
  preferredZoneTypes: ['container', 'herbSpiral', 'orchardPerennial'],
});

const strawberry: PlantDefinition = withCompatibility({
  id: 'plant-5',
  commonName: 'Strawberry',
  varietyName: 'Albion',
  category: 'perennial',
  lifecycle: 'perennial',
  spacingMm: 305,
  spreadMm: 305,
  heightMm: 254,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 90,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  conflictPlantNames: ['Thyme'],
  preferredZoneTypes: ['container', 'orchardPerennial'],
});

const document: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Backyard',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 24,
    heightCells: 16,
    cellSizeMm: 305,
    seasonTag: '2026',
    sunProfile: {
      shadeEdge: 'north',
      shadeDepthCells: 2,
      partShadeDepthCells: 4,
    },
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [
    {
      id: 'zone-1',
      gardenPlanId: 'plan-1',
      type: 'raisedBed',
      shape: 'rectangle',
      name: 'North Bed',
      notes: '',
      gridX: 2,
      gridY: 2,
      widthCells: 4,
      heightCells: 3,
      rotationDegrees: 0,
      styleKey: 'raised-bed',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
    {
      id: 'zone-2',
      gardenPlanId: 'plan-1',
      type: 'pathway',
      shape: 'rectangle',
      name: 'Path',
      notes: '',
      gridX: 4,
      gridY: 3,
      widthCells: 5,
      heightCells: 2,
      rotationDegrees: 0,
      styleKey: 'pathway',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
  placements: [
    {
      id: 'placement-1',
      gardenPlanId: 'plan-1',
      plantDefinitionId: 'plant-1',
      zoneId: 'zone-1',
      notes: '',
      gridX: 7,
      gridY: 2,
      footprintWidthCells: 2,
      footprintHeightCells: 2,
      quantity: 1,
      layoutPattern: 'single',
      rotationDegrees: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
    },
  ],
};

describe('validatePlannerDocument', () => {
  it('warns when zones overlap', () => {
    const issues = validatePlannerDocument(document, [tomato]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'zone-overlap',
          severity: 'warning',
          entityIds: ['zone-1', 'zone-2'],
        }),
      ]),
    );
  });

  it('warns when a placement falls outside of its growable zone', () => {
    const issues = validatePlannerDocument(document, [tomato]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'plant-outside-zone',
          severity: 'warning',
          entityIds: ['placement-1', 'zone-1'],
        }),
      ]),
    );
  });

  it('warns when plant footprints overlap and violate spacing', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        placements: [
          {
            ...document.placements[0],
            id: 'placement-a',
            zoneId: 'zone-1',
            gridX: 2,
            gridY: 2,
          },
          {
            ...document.placements[0],
            id: 'placement-b',
            zoneId: 'zone-1',
            gridX: 3,
            gridY: 2,
          },
        ],
      },
      [tomato],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'plant-spacing',
          severity: 'warning',
          entityIds: ['placement-a', 'placement-b'],
        }),
      ]),
    );
  });

  it('warns when plants are adjacent but still tighter than the recommended spacing', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        placements: [
          {
            ...document.placements[0],
            id: 'placement-near-a',
            plantDefinitionId: 'plant-3',
            zoneId: 'zone-1',
            gridX: 2,
            gridY: 2,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
          {
            ...document.placements[0],
            id: 'placement-near-b',
            plantDefinitionId: 'plant-3',
            zoneId: 'zone-1',
            gridX: 3,
            gridY: 2,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
        ],
      },
      [tomato, pepper],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'plant-spacing',
          severity: 'warning',
          entityIds: ['placement-near-a', 'placement-near-b'],
          message: expect.stringMatching(/recommended spacing/i),
        }),
      ]),
    );
  });

  it('does not warn when center spacing meets the recommendation', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        placements: [
          {
            ...document.placements[0],
            id: 'placement-clear-a',
            plantDefinitionId: 'plant-3',
            zoneId: 'zone-1',
            gridX: 2,
            gridY: 2,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
          {
            ...document.placements[0],
            id: 'placement-clear-b',
            plantDefinitionId: 'plant-3',
            zoneId: 'zone-1',
            gridX: 4,
            gridY: 2,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
        ],
      },
      [tomato, pepper],
    );

    expect(
      issues.filter((issue) => issue.code === 'plant-spacing'),
    ).toEqual([]);
  });

  it('warns when a growable zone mixes crops with conflicting water needs', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-irrigation',
            name: 'Mixed Water Bed',
            type: 'raisedBed',
            gridX: 2,
            gridY: 6,
            widthCells: 4,
            heightCells: 2,
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-water-a',
            plantDefinitionId: 'plant-1',
            zoneId: 'zone-irrigation',
            gridX: 2,
            gridY: 6,
            footprintWidthCells: 2,
            footprintHeightCells: 2,
          },
          {
            ...document.placements[0],
            id: 'placement-water-b',
            plantDefinitionId: 'plant-4',
            zoneId: 'zone-irrigation',
            gridX: 5,
            gridY: 6,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
        ],
      },
      [tomato, lettuce, pepper, thyme],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'irrigation-balance',
          severity: 'warning',
          entityIds: ['zone-irrigation', 'placement-water-a', 'placement-water-b'],
          message: expect.stringMatching(/split into separate watering runs/i),
        }),
      ]),
    );
  });

  it('warns when a non-herb crop is assigned to an herb spiral zone', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-herb',
            type: 'herbSpiral',
            shape: 'circle',
            name: 'Herb Spiral',
            widthCells: 4,
            heightCells: 4,
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-herb',
            zoneId: 'zone-herb',
            gridX: 2,
            gridY: 2,
            footprintWidthCells: 2,
            footprintHeightCells: 2,
          },
        ],
      },
      [tomato, thyme],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'zone-compatibility',
          severity: 'warning',
          entityIds: ['placement-herb', 'zone-herb'],
        }),
      ]),
    );
  });

  it('warns when a non-vertical crop is assigned to a trellis zone', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-trellis',
            type: 'trellis',
            name: 'Fence Trellis',
            gridX: 0,
            gridY: 0,
            widthCells: 2,
            heightCells: 4,
            styleKey: 'trellis',
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-trellis',
            plantDefinitionId: 'plant-2',
            zoneId: 'zone-trellis',
            gridX: 0,
            gridY: 0,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
        ],
      },
      [tomato, lettuce],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'zone-compatibility',
          severity: 'warning',
          entityIds: ['placement-trellis', 'zone-trellis'],
          message: expect.stringMatching(/raised bed|container|in-ground bed/i),
        }),
      ]),
    );
  });

  it('warns when an annual crop is assigned to an orchard zone', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-orchard',
            type: 'orchardPerennial',
            name: 'Berry Lane',
            gridX: 8,
            gridY: 8,
            widthCells: 4,
            heightCells: 4,
            styleKey: 'orchard-perennial',
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-orchard',
            zoneId: 'zone-orchard',
            gridX: 8,
            gridY: 8,
            footprintWidthCells: 2,
            footprintHeightCells: 2,
          },
        ],
      },
      [tomato],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'zone-compatibility',
          severity: 'warning',
          entityIds: ['placement-orchard', 'zone-orchard'],
          message: expect.stringMatching(/raised bed|trellis|in-ground bed/i),
        }),
      ]),
    );
  });

  it('warns when conflicting plants share a growable zone', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-conflict',
            name: 'Mixed Patch',
            gridX: 2,
            gridY: 8,
            widthCells: 4,
            heightCells: 2,
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-conflict-a',
            plantDefinitionId: 'plant-4',
            zoneId: 'zone-conflict',
            gridX: 2,
            gridY: 8,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
          {
            ...document.placements[0],
            id: 'placement-conflict-b',
            plantDefinitionId: 'plant-5',
            zoneId: 'zone-conflict',
            gridX: 4,
            gridY: 8,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
        ],
      },
      [tomato, lettuce, pepper, thyme, strawberry],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'plant-conflict',
          severity: 'warning',
          entityIds: ['placement-conflict-a', 'placement-conflict-b', 'zone-conflict'],
          message: expect.stringMatching(/thyme|strawberry/i),
        }),
      ]),
    );
  });

  it('warns when a full-sun crop sits mostly in shade', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-sun',
            name: 'North Border',
            gridX: 0,
            gridY: 0,
            widthCells: 8,
            heightCells: 8,
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-sun',
            zoneId: 'zone-sun',
            gridX: 1,
            gridY: 0,
            footprintWidthCells: 2,
            footprintHeightCells: 2,
          },
        ],
      },
      [tomato],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'zone-compatibility',
          severity: 'warning',
          entityIds: ['placement-sun'],
          message: expect.stringMatching(/tomato prefers full sun/i),
        }),
      ]),
    );
  });

  it('warns when a shade crop sits mostly in full sun', () => {
    const issues = validatePlannerDocument(
      {
        ...document,
        zones: [
          {
            ...document.zones[0],
            id: 'zone-shade',
            name: 'South Border',
            gridX: 0,
            gridY: 4,
            widthCells: 8,
            heightCells: 8,
          },
        ],
        placements: [
          {
            ...document.placements[0],
            id: 'placement-shade',
            plantDefinitionId: 'plant-2',
            zoneId: 'zone-shade',
            gridX: 2,
            gridY: 8,
            footprintWidthCells: 1,
            footprintHeightCells: 1,
          },
        ],
      },
      [tomato, lettuce],
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'zone-compatibility',
          severity: 'warning',
          entityIds: ['placement-shade'],
          message: expect.stringMatching(/lettuce prefers shade/i),
        }),
      ]),
    );
  });
});
