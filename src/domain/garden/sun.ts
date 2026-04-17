import type { GardenPlan, SunProfile } from '@/domain/garden/models';

export interface SunExposureBand {
  key: 'shade' | 'partSun' | 'fullSun';
  label: string;
  gridX: number;
  gridY: number;
  widthCells: number;
  heightCells: number;
}

export interface GridBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const defaultSunProfile: SunProfile = {
  shadeEdge: 'north',
  shadeDepthCells: 2,
  partShadeDepthCells: 4,
};

const clampInteger = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

const getDepthLimit = (
  widthCells: number,
  heightCells: number,
  shadeEdge: SunProfile['shadeEdge'],
) => (shadeEdge === 'north' || shadeEdge === 'south' ? heightCells : widthCells);

export const normalizeSunProfile = (
  sunProfile: Partial<SunProfile> | null | undefined,
  widthCells: number,
  heightCells: number,
): SunProfile => {
  const shadeEdge = sunProfile?.shadeEdge ?? defaultSunProfile.shadeEdge;
  const depthLimit = Math.max(0, getDepthLimit(widthCells, heightCells, shadeEdge));
  const shadeDepthCells = clampInteger(
    sunProfile?.shadeDepthCells ?? defaultSunProfile.shadeDepthCells,
    0,
    depthLimit,
  );
  const partShadeDepthCells = clampInteger(
    Math.max(
      sunProfile?.partShadeDepthCells ?? defaultSunProfile.partShadeDepthCells,
      shadeDepthCells,
    ),
    shadeDepthCells,
    depthLimit,
  );

  return {
    shadeEdge,
    shadeDepthCells,
    partShadeDepthCells,
  };
};

export const getPlanSunProfile = (
  plan: Pick<GardenPlan, 'widthCells' | 'heightCells' | 'sunProfile'>,
) => normalizeSunProfile(plan.sunProfile, plan.widthCells, plan.heightCells);

const createHorizontalBand = (
  key: SunExposureBand['key'],
  label: SunExposureBand['label'],
  widthCells: number,
  heightCells: number,
  shadeEdge: SunProfile['shadeEdge'],
  startDepth: number,
  depth: number,
): SunExposureBand | null => {
  if (depth <= 0) {
    return null;
  }

  return {
    key,
    label,
    gridX: 0,
    gridY: shadeEdge === 'north' ? startDepth : heightCells - startDepth - depth,
    widthCells,
    heightCells: depth,
  };
};

const createVerticalBand = (
  key: SunExposureBand['key'],
  label: SunExposureBand['label'],
  widthCells: number,
  heightCells: number,
  shadeEdge: SunProfile['shadeEdge'],
  startDepth: number,
  depth: number,
): SunExposureBand | null => {
  if (depth <= 0) {
    return null;
  }

  return {
    key,
    label,
    gridX: shadeEdge === 'west' ? startDepth : widthCells - startDepth - depth,
    gridY: 0,
    widthCells: depth,
    heightCells,
  };
};

export const buildSunExposureBands = (
  plan: Pick<GardenPlan, 'widthCells' | 'heightCells' | 'sunProfile'>,
): SunExposureBand[] => {
  const sunProfile = getPlanSunProfile(plan);
  const shadeDepth = sunProfile.shadeDepthCells;
  const partSunDepth = Math.max(0, sunProfile.partShadeDepthCells - shadeDepth);
  const fullSunDepth = Math.max(
    0,
    getDepthLimit(plan.widthCells, plan.heightCells, sunProfile.shadeEdge) -
      sunProfile.partShadeDepthCells,
  );
  const createBand =
    sunProfile.shadeEdge === 'north' || sunProfile.shadeEdge === 'south'
      ? createHorizontalBand
      : createVerticalBand;

  return [
    createBand(
      'shade',
      'Shade',
      plan.widthCells,
      plan.heightCells,
      sunProfile.shadeEdge,
      0,
      shadeDepth,
    ),
    createBand(
      'partSun',
      'Part sun',
      plan.widthCells,
      plan.heightCells,
      sunProfile.shadeEdge,
      shadeDepth,
      partSunDepth,
    ),
    createBand(
      'fullSun',
      'Full sun',
      plan.widthCells,
      plan.heightCells,
      sunProfile.shadeEdge,
      sunProfile.partShadeDepthCells,
      fullSunDepth,
    ),
  ].filter((band): band is SunExposureBand => band !== null);
};

const getOverlapArea = (left: GridBounds, right: GridBounds) => {
  const overlapWidth = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const overlapHeight = Math.max(
    0,
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
  );

  return overlapWidth * overlapHeight;
};

export const getDominantSunExposure = (
  plan: Pick<GardenPlan, 'widthCells' | 'heightCells' | 'sunProfile'>,
  bounds: GridBounds,
): SunExposureBand['key'] | null => {
  const overlaps = buildSunExposureBands(plan)
    .map((band) => ({
      key: band.key,
      area: getOverlapArea(bounds, {
        left: band.gridX,
        top: band.gridY,
        right: band.gridX + band.widthCells,
        bottom: band.gridY + band.heightCells,
      }),
    }))
    .filter((entry) => entry.area > 0);

  if (overlaps.length === 0) {
    return null;
  }

  overlaps.sort((left, right) => right.area - left.area);
  return overlaps[0]?.key ?? null;
};
