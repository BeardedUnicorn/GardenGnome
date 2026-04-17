import type { GardenZone, MeasurementSystem } from '@/domain/garden/models';

export interface RectangleBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const inchesToMillimeters = (inches: number) => Math.round(inches * 25.4);

export const millimetersToInches = (millimeters: number) =>
  Math.round(millimeters / 25.4);

export const cellToMillimeters = (cellCount: number, cellSizeMm: number) =>
  cellCount * cellSizeMm;

export const snapMillimetersToCell = (valueMm: number, cellSizeMm: number) =>
  Math.round(valueMm / cellSizeMm);

export const getZoneBounds = (zone: Pick<GardenZone, 'gridX' | 'gridY' | 'widthCells' | 'heightCells'>): RectangleBounds => ({
  left: zone.gridX,
  top: zone.gridY,
  right: zone.gridX + zone.widthCells,
  bottom: zone.gridY + zone.heightCells,
});

export const rectanglesOverlap = (left: RectangleBounds, right: RectangleBounds) =>
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

export const rectangleContainsRectangle = (
  container: RectangleBounds,
  child: RectangleBounds,
) =>
  child.left >= container.left &&
  child.right <= container.right &&
  child.top >= container.top &&
  child.bottom <= container.bottom;

const formatDistanceValue = (value: number) =>
  (() => {
    const roundedValue = Math.round(value * 10) / 10;

    return Number.isInteger(roundedValue)
      ? roundedValue.toString()
      : roundedValue.toFixed(1);
  })();

export const formatDistanceLabel = (
  distanceMm: number,
  measurementSystem: MeasurementSystem,
) =>
  measurementSystem === 'metric'
    ? `${formatDistanceValue(distanceMm / 1000)} m`
    : `${formatDistanceValue(distanceMm / 304.8)} ft`;

export const formatFootprintLabel = (
  widthCells: number,
  heightCells: number,
  cellSizeMm: number,
  measurementSystem: MeasurementSystem,
) =>
  `${formatDistanceLabel(widthCells * cellSizeMm, measurementSystem)} × ${formatDistanceLabel(
    heightCells * cellSizeMm,
    measurementSystem,
  )}`;
