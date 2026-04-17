import { describe, expect, it } from 'vitest';

import { buildSunExposureBands, normalizeSunProfile } from '@/domain/garden/sun';

describe('sun exposure helpers', () => {
  it('builds stacked north-edge bands across the plan height', () => {
    const bands = buildSunExposureBands({
      widthCells: 12,
      heightCells: 10,
      sunProfile: {
        shadeEdge: 'north',
        shadeDepthCells: 2,
        partShadeDepthCells: 4,
      },
    });

    expect(bands).toEqual([
      {
        key: 'shade',
        label: 'Shade',
        gridX: 0,
        gridY: 0,
        widthCells: 12,
        heightCells: 2,
      },
      {
        key: 'partSun',
        label: 'Part sun',
        gridX: 0,
        gridY: 2,
        widthCells: 12,
        heightCells: 2,
      },
      {
        key: 'fullSun',
        label: 'Full sun',
        gridX: 0,
        gridY: 4,
        widthCells: 12,
        heightCells: 6,
      },
    ]);
  });

  it('clamps sun profile depths to the available edge span', () => {
    expect(
      normalizeSunProfile(
        {
          shadeEdge: 'west',
          shadeDepthCells: 8,
          partShadeDepthCells: 12,
        },
        6,
        10,
      ),
    ).toEqual({
      shadeEdge: 'west',
      shadeDepthCells: 6,
      partShadeDepthCells: 6,
    });
  });
});
