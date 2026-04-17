import { describe, expect, it } from 'vitest';

import {
  cellToMillimeters,
  formatDistanceLabel,
  formatFootprintLabel,
  getZoneBounds,
  inchesToMillimeters,
  millimetersToInches,
  rectanglesOverlap,
  snapMillimetersToCell,
} from '@/domain/geometry/geometry';
import type { GardenZone } from '@/domain/garden/models';

const rectangleZone: GardenZone = {
  id: 'zone-1',
  gardenPlanId: 'plan-1',
  type: 'raisedBed',
  shape: 'rectangle',
  name: 'North Bed',
  notes: '',
  gridX: 2,
  gridY: 3,
  widthCells: 4,
  heightCells: 2,
  rotationDegrees: 0,
  styleKey: 'raised-bed',
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
};

describe('geometry helpers', () => {
  it('converts imperial inches into rounded integer millimeters', () => {
    expect(inchesToMillimeters(12)).toBe(305);
    expect(inchesToMillimeters(18)).toBe(457);
  });

  it('converts integer millimeters back into rounded inches for inspector controls', () => {
    expect(millimetersToInches(305)).toBe(12);
    expect(millimetersToInches(457)).toBe(18);
  });

  it('converts cell spans into millimeters', () => {
    expect(cellToMillimeters(4, 305)).toBe(1220);
  });

  it('formats snapped distances for imperial and metric overlays', () => {
    expect(formatDistanceLabel(3660, 'imperial')).toBe('12 ft');
    expect(formatDistanceLabel(3660, 'metric')).toBe('3.7 m');
  });

  it('formats footprint labels using the active measurement system', () => {
    expect(formatFootprintLabel(4, 2, 305, 'imperial')).toBe('4 ft × 2 ft');
    expect(formatFootprintLabel(4, 2, 300, 'metric')).toBe('1.2 m × 0.6 m');
  });

  it('snaps millimeter positions to the nearest cell', () => {
    expect(snapMillimetersToCell(130, 305)).toBe(0);
    expect(snapMillimetersToCell(170, 305)).toBe(1);
    expect(snapMillimetersToCell(590, 305)).toBe(2);
  });

  it('calculates zone bounds in grid cells', () => {
    expect(getZoneBounds(rectangleZone)).toEqual({
      left: 2,
      top: 3,
      right: 6,
      bottom: 5,
    });
  });

  it('detects overlapping rectangles', () => {
    expect(
      rectanglesOverlap(
        { left: 0, top: 0, right: 4, bottom: 4 },
        { left: 3, top: 1, right: 5, bottom: 3 },
      ),
    ).toBe(true);

    expect(
      rectanglesOverlap(
        { left: 0, top: 0, right: 4, bottom: 4 },
        { left: 4, top: 0, right: 6, bottom: 4 },
      ),
    ).toBe(false);
  });
});
