import type { ShapeType, ZoneType } from '@/domain/garden/models';

export interface ZonePreset {
  label: string;
  type: ZoneType;
  shape: ShapeType;
  widthCells: number;
  heightCells: number;
  styleKey: string;
}

export const zonePresets: Record<ZoneType, ZonePreset> = {
  raisedBed: {
    label: 'Raised bed',
    type: 'raisedBed',
    shape: 'rectangle',
    widthCells: 4,
    heightCells: 2,
    styleKey: 'raised-bed',
  },
  inGroundBed: {
    label: 'In-ground bed',
    type: 'inGroundBed',
    shape: 'rectangle',
    widthCells: 5,
    heightCells: 3,
    styleKey: 'in-ground-bed',
  },
  container: {
    label: 'Container',
    type: 'container',
    shape: 'circle',
    widthCells: 2,
    heightCells: 2,
    styleKey: 'container',
  },
  herbSpiral: {
    label: 'Herb spiral',
    type: 'herbSpiral',
    shape: 'circle',
    widthCells: 3,
    heightCells: 3,
    styleKey: 'herb-spiral',
  },
  trellis: {
    label: 'Trellis',
    type: 'trellis',
    shape: 'rectangle',
    widthCells: 2,
    heightCells: 4,
    styleKey: 'trellis',
  },
  orchardPerennial: {
    label: 'Orchard / perennial',
    type: 'orchardPerennial',
    shape: 'rectangle',
    widthCells: 4,
    heightCells: 4,
    styleKey: 'orchard-perennial',
  },
  greenhouseZone: {
    label: 'Greenhouse zone',
    type: 'greenhouseZone',
    shape: 'rectangle',
    widthCells: 5,
    heightCells: 3,
    styleKey: 'greenhouse-zone',
  },
  decorativePlantingArea: {
    label: 'Decorative planting area',
    type: 'decorativePlantingArea',
    shape: 'circle',
    widthCells: 4,
    heightCells: 4,
    styleKey: 'decorative-planting-area',
  },
  compostArea: {
    label: 'Compost area',
    type: 'compostArea',
    shape: 'rectangle',
    widthCells: 2,
    heightCells: 2,
    styleKey: 'compost-area',
  },
  pathway: {
    label: 'Pathway',
    type: 'pathway',
    shape: 'rectangle',
    widthCells: 4,
    heightCells: 1,
    styleKey: 'pathway',
  },
};
