import { type DragEvent, type MouseEvent, type PointerEvent, useRef, useState } from 'react';

import type { GardenZone, PlantPlacement } from '@/domain/garden/models';
import { buildIrrigationRecommendations } from '@/domain/garden/irrigation';
import { buildSunExposureBands } from '@/domain/garden/sun';
import { formatDistanceLabel, formatFootprintLabel } from '@/domain/geometry/geometry';
import { getDraggedPlantId } from '@/features/plants/drag';
import type { PlantDefinition } from '@/domain/plants/models';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';
import { useViewportStore } from '@/stores/viewportStore';

const cellSizePx = 42;
const isAdditiveSelection = (event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) =>
  event.shiftKey || event.metaKey || event.ctrlKey;

const zoneVisuals: Record<
  GardenZone['type'],
  { fill: string; stroke: string; label: string }
> = {
  raisedBed: { fill: 'rgba(91, 59, 24, 0.44)', stroke: '#5d3b1d', label: 'RB' },
  inGroundBed: { fill: 'rgba(91, 115, 45, 0.28)', stroke: '#4d6322', label: 'IG' },
  container: { fill: 'rgba(173, 101, 48, 0.35)', stroke: '#9a5928', label: 'CT' },
  herbSpiral: { fill: 'rgba(131, 170, 99, 0.42)', stroke: '#547242', label: 'HS' },
  trellis: { fill: 'rgba(163, 117, 79, 0.18)', stroke: '#8b5a30', label: 'TR' },
  orchardPerennial: { fill: 'rgba(116, 154, 86, 0.3)', stroke: '#4c6a37', label: 'OP' },
  greenhouseZone: { fill: 'rgba(136, 169, 187, 0.28)', stroke: '#53798e', label: 'GH' },
  decorativePlantingArea: {
    fill: 'rgba(201, 131, 150, 0.24)',
    stroke: '#9b536d',
    label: 'DP',
  },
  compostArea: { fill: 'rgba(112, 84, 49, 0.34)', stroke: '#5f4220', label: 'CA' },
  pathway: { fill: 'rgba(204, 189, 165, 0.65)', stroke: '#9f8d74', label: 'PW' },
};

const plantColor = (plant?: PlantDefinition) => {
  switch (plant?.category) {
    case 'fruiting':
      return '#c95e45';
    case 'leafy':
      return '#4b7a48';
    case 'root':
      return '#c8873b';
    case 'flower':
      return '#d06b86';
    case 'perennial':
      return '#6d8d57';
    case 'herb':
    default:
      return '#4e8e6a';
  }
};

const placementHasIssue = (
  placement: PlantPlacement,
  issueEntityIds: Set<string>,
) => issueEntityIds.has(placement.id);

const sunBandVisuals = {
  shade: { fill: 'rgba(63, 97, 109, 0.2)', stroke: 'rgba(63, 97, 109, 0.36)' },
  partSun: { fill: 'rgba(205, 182, 104, 0.16)', stroke: 'rgba(180, 144, 45, 0.32)' },
  fullSun: { fill: 'rgba(246, 214, 107, 0.12)', stroke: 'rgba(211, 161, 37, 0.2)' },
} as const;

const noteBadgeColors = {
  fill: 'rgba(36, 54, 40, 0.86)',
  stroke: 'rgba(206, 220, 197, 0.34)',
} as const;

interface DragState {
  type: 'zone' | 'placement';
  originClientX: number;
  originClientY: number;
  deltaX: number;
  deltaY: number;
  minDeltaX: number;
  maxDeltaX: number;
  minDeltaY: number;
  maxDeltaY: number;
  entities: Array<{
    id: string;
    originGridX: number;
    originGridY: number;
    widthCells: number;
    heightCells: number;
  }>;
}

const clampGridCoordinate = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toNoteExcerpt = (note: string, maxLength = 26) => {
  const normalized = note.trim().replace(/\s+/g, ' ');

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

export const PlannerCanvas = () => {
  const activeDocument = useGardenStore((state) => state.activeDocument);
  const settings = useGardenStore((state) => state.settings);
  const plantDefinitions = useGardenStore((state) => state.plantDefinitions);
  const validationIssues = useGardenStore((state) => state.validationIssues);
  const createZoneAt = useGardenStore((state) => state.createZoneAt);
  const createPlacementAt = useGardenStore((state) => state.createPlacementAt);
  const updateZones = useGardenStore((state) => state.updateZones);
  const updatePlacements = useGardenStore((state) => state.updatePlacements);
  const activeTool = usePlannerUiStore((state) => state.activeTool);
  const armedPlantId = usePlannerUiStore((state) => state.armedPlantId);
  const placementPattern = usePlannerUiStore((state) => state.placementPattern);
  const placementCount = usePlannerUiStore((state) => state.placementCount);
  const selection = usePlannerUiStore((state) => state.selection);
  const visibleLayers = usePlannerUiStore((state) => state.visibleLayers);
  const clearSelection = usePlannerUiStore((state) => state.clearSelection);
  const selectZone = usePlannerUiStore((state) => state.selectZone);
  const selectPlacement = usePlannerUiStore((state) => state.selectPlacement);
  const scale = useViewportStore((state) => state.scale);
  const offsetX = useViewportStore((state) => state.offsetX);
  const offsetY = useViewportStore((state) => state.offsetY);
  const panBy = useViewportStore((state) => state.panBy);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const plantDragPositionRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const suppressCanvasClickRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPlantDropTarget, setIsPlantDropTarget] = useState(false);

  if (!activeDocument) {
    return null;
  }

  const issueEntityIds = new Set(validationIssues.flatMap((issue) => issue.entityIds));
  const widthPx = activeDocument.plan.widthCells * cellSizePx;
  const heightPx = activeDocument.plan.heightCells * cellSizePx;
  const planWidthLabel = formatDistanceLabel(
    activeDocument.plan.widthCells * activeDocument.plan.cellSizeMm,
    activeDocument.plan.measurementSystem,
  );
  const planHeightLabel = formatDistanceLabel(
    activeDocument.plan.heightCells * activeDocument.plan.cellSizeMm,
    activeDocument.plan.measurementSystem,
  );
  const columns = Array.from({ length: activeDocument.plan.widthCells + 1 }, (_, index) => index);
  const rows = Array.from({ length: activeDocument.plan.heightCells + 1 }, (_, index) => index);
  const sunExposureBands = buildSunExposureBands(activeDocument.plan);
  const irrigationRecommendations = buildIrrigationRecommendations(
    activeDocument,
    plantDefinitions,
  );
  const irrigationRecommendationMap = new Map(
    irrigationRecommendations.map((recommendation) => [recommendation.zoneId, recommendation]),
  );
  const getDraggedPosition = (
    type: DragState['type'],
    id: string,
    gridX: number,
    gridY: number,
  ) => {
    if (dragState?.type !== type) {
      return { gridX, gridY };
    }

    const draggedEntity = dragState.entities.find((entity) => entity.id === id);

    return draggedEntity
      ? {
          gridX: draggedEntity.originGridX + dragState.deltaX,
          gridY: draggedEntity.originGridY + dragState.deltaY,
        }
      : { gridX, gridY };
  };

  const toCell = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    const x = (clientX - (rect?.left ?? 0)) / normalizedScale;
    const y = (clientY - (rect?.top ?? 0)) / normalizedScale;

    return {
      cellX: Math.max(0, Math.floor(x / cellSizePx)),
      cellY: Math.max(0, Math.floor(y / cellSizePx)),
    };
  };

  const updatePlantDragPosition = (clientX: number, clientY: number) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return;
    }

    plantDragPositionRef.current = { clientX, clientY };
  };

  const finishDrag = () => {
    if (!dragState) {
      return;
    }

    const moved =
      dragState.deltaX !== 0 || dragState.deltaY !== 0;

    if (moved) {
      if (dragState.type === 'zone') {
        updateZones(
          dragState.entities.map((entity) => ({
            zoneId: entity.id,
            patch: {
              gridX: entity.originGridX + dragState.deltaX,
              gridY: entity.originGridY + dragState.deltaY,
            },
          })),
        );
      } else {
        updatePlacements(
          dragState.entities.map((entity) => ({
            placementId: entity.id,
            patch: {
              gridX: entity.originGridX + dragState.deltaX,
              gridY: entity.originGridY + dragState.deltaY,
            },
          })),
        );
      }

      suppressCanvasClickRef.current = true;
    }

    setDragState(null);
  };

  const handleCanvasClick = (clientX: number, clientY: number) => {
    const { cellX, cellY } = toCell(clientX, clientY);

    if (
      activeTool !== 'select' &&
      activeTool !== 'pan'
    ) {
      createZoneAt(activeTool, cellX, cellY);
      return;
    }

    if (armedPlantId) {
      createPlacementAt(armedPlantId, cellX, cellY, {
        layoutPattern: placementPattern,
        count:
          placementPattern === 'row' || placementPattern === 'cluster'
            ? placementCount
            : 1,
      });
      return;
    }

    clearSelection();
  };

  const handlePlantDrop = (
    event: Pick<DragEvent<HTMLDivElement>, 'clientX' | 'clientY' | 'dataTransfer'>,
  ) => {
    const plantId = getDraggedPlantId(event);

    if (!plantId) {
      return;
    }

    const dropPosition =
      Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? { clientX: event.clientX, clientY: event.clientY }
        : plantDragPositionRef.current;
    const { cellX, cellY } = toCell(dropPosition?.clientX ?? 0, dropPosition?.clientY ?? 0);

    plantDragPositionRef.current = null;
    createPlacementAt(plantId, cellX, cellY, {
      layoutPattern: placementPattern,
      count:
        placementPattern === 'row' || placementPattern === 'cluster'
          ? placementCount
          : 1,
    });
  };

  const handleEntityClick = (
    event: Pick<MouseEvent<SVGGElement>, 'clientX' | 'clientY' | 'stopPropagation'>,
    onSelect: () => void,
  ) => {
    event.stopPropagation();

    if (armedPlantId || activeTool !== 'select') {
      if (activeTool !== 'pan' || armedPlantId) {
        handleCanvasClick(event.clientX, event.clientY);
      }

      return;
    }

    onSelect();
  };

  const handleEntityPointerDown = (
    event: Pick<
      PointerEvent<SVGGElement>,
      'clientX' | 'clientY' | 'stopPropagation' | 'shiftKey' | 'metaKey' | 'ctrlKey'
    >,
    entity: {
      id: string;
      gridX: number;
      gridY: number;
      widthCells: number;
      heightCells: number;
    },
    type: DragState['type'],
    onSelect: () => void,
  ) => {
    event.stopPropagation();

    if (
      activeTool !== 'select' ||
      armedPlantId ||
      isAdditiveSelection(event)
    ) {
      return;
    }

    const selectedIds =
      selection.type === type && selection.ids.includes(entity.id)
        ? selection.ids
        : [entity.id];
    const draggedEntities =
      type === 'zone'
        ? activeDocument.zones
            .filter((zone) => selectedIds.includes(zone.id))
            .map((zone) => ({
              id: zone.id,
              originGridX: zone.gridX,
              originGridY: zone.gridY,
              widthCells: zone.widthCells,
              heightCells: zone.heightCells,
            }))
        : activeDocument.placements
            .filter((placement) => selectedIds.includes(placement.id))
            .map((placement) => ({
              id: placement.id,
              originGridX: placement.gridX,
              originGridY: placement.gridY,
              widthCells: placement.footprintWidthCells,
              heightCells: placement.footprintHeightCells,
            }));

    if (draggedEntities.length === 0) {
      return;
    }

    if (!(selection.type === type && selection.ids.includes(entity.id))) {
      onSelect();
    }

    setDragState({
      type,
      originClientX: event.clientX,
      originClientY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      minDeltaX: Math.max(
        ...draggedEntities.map((draggedEntity) => -draggedEntity.originGridX),
      ),
      maxDeltaX: Math.min(
        ...draggedEntities.map(
          (draggedEntity) =>
            activeDocument.plan.widthCells -
            draggedEntity.widthCells -
            draggedEntity.originGridX,
        ),
      ),
      minDeltaY: Math.max(
        ...draggedEntities.map((draggedEntity) => -draggedEntity.originGridY),
      ),
      maxDeltaY: Math.min(
        ...draggedEntities.map(
          (draggedEntity) =>
            activeDocument.plan.heightCells -
            draggedEntity.heightCells -
            draggedEntity.originGridY,
        ),
      ),
      entities: draggedEntities,
    });
  };

  return (
    <section className="planner-canvas card">
      <div className="card-heading">
        <p className="eyebrow">Canvas</p>
        <h3>Grid and placements</h3>
      </div>

      <div
        className={`planner-stage ${
          activeTool === 'pan' ? 'planner-stage--pan' : ''
        } ${isPlantDropTarget ? 'planner-stage--drop-target' : ''}`}
        onClick={(event) => {
          if (suppressCanvasClickRef.current) {
            suppressCanvasClickRef.current = false;
            return;
          }

          if (!isPanning) {
            handleCanvasClick(event.clientX, event.clientY);
          }
        }}
        onPointerDown={(event) => {
          if (activeTool === 'pan') {
            setIsPanning(true);
            setPanOrigin({ x: event.clientX, y: event.clientY });
          }
        }}
        onPointerLeave={() => {
          setIsPanning(false);
          setPanOrigin(null);
          finishDrag();
        }}
        onPointerMove={(event) => {
          if (dragState) {
            const deltaX = Math.round(
              (event.clientX - dragState.originClientX) / (cellSizePx * scale),
            );
            const deltaY = Math.round(
              (event.clientY - dragState.originClientY) / (cellSizePx * scale),
            );
            const nextDeltaX = clampGridCoordinate(
              deltaX,
              dragState.minDeltaX,
              dragState.maxDeltaX,
            );
            const nextDeltaY = clampGridCoordinate(
              deltaY,
              dragState.minDeltaY,
              dragState.maxDeltaY,
            );

            setDragState((current) =>
              current &&
              (current.deltaX !== nextDeltaX || current.deltaY !== nextDeltaY)
                ? {
                    ...current,
                    deltaX: nextDeltaX,
                    deltaY: nextDeltaY,
                  }
                : current,
            );
            return;
          }

          if (!isPanning || !panOrigin) {
            return;
          }

          panBy(event.clientX - panOrigin.x, event.clientY - panOrigin.y);
          setPanOrigin({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={() => {
          setIsPanning(false);
          setPanOrigin(null);
          finishDrag();
        }}
        onDragEnter={(event) => {
          if (!getDraggedPlantId(event)) {
            return;
          }

          event.preventDefault();
          updatePlantDragPosition(event.clientX, event.clientY);
          setIsPlantDropTarget(true);
        }}
        onDragLeave={() => {
          plantDragPositionRef.current = null;
          setIsPlantDropTarget(false);
        }}
        onDragOver={(event) => {
          if (!getDraggedPlantId(event)) {
            return;
          }

          event.preventDefault();
          updatePlantDragPosition(event.clientX, event.clientY);
          setIsPlantDropTarget(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsPlantDropTarget(false);
          handlePlantDrop(event);
        }}
        ref={stageRef}
      >
        <div
          className="planner-surface"
          ref={surfaceRef}
          style={{
            width: widthPx,
            height: heightPx,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          }}
        >
          <svg height={heightPx} width={widthPx}>
            {settings.showGrid
              ? rows.map((row) => (
                  <line
                    className="grid-line"
                    key={`row-${row}`}
                    x1={0}
                    x2={widthPx}
                    y1={row * cellSizePx}
                    y2={row * cellSizePx}
                  />
                ))
              : null}
            {settings.showGrid
              ? columns.map((column) => (
                  <line
                    className="grid-line"
                    key={`column-${column}`}
                    x1={column * cellSizePx}
                    x2={column * cellSizePx}
                    y1={0}
                    y2={heightPx}
                  />
                ))
              : null}

            {visibleLayers.sunShade
              ? sunExposureBands.map((band) => {
                  const visual = sunBandVisuals[band.key];
                  const bandX = band.gridX * cellSizePx;
                  const bandY = band.gridY * cellSizePx;
                  const bandWidth = band.widthCells * cellSizePx;
                  const bandHeight = band.heightCells * cellSizePx;

                  return (
                    <g className="sun-band" key={band.key}>
                      <rect
                        fill={visual.fill}
                        height={bandHeight}
                        stroke={visual.stroke}
                        strokeWidth={1.5}
                        width={bandWidth}
                        x={bandX}
                        y={bandY}
                      />
                      <text
                        className="sun-band-label"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={bandX + bandWidth / 2}
                        y={bandY + bandHeight / 2}
                      >
                        {band.label}
                      </text>
                    </g>
                  );
                })
              : null}

            {visibleLayers.zones
              ? activeDocument.zones.map((zone) => {
                  const zonePosition = getDraggedPosition(
                    'zone',
                    zone.id,
                    zone.gridX,
                    zone.gridY,
                  );
                  const zoneX = zonePosition.gridX * cellSizePx;
                  const zoneY = zonePosition.gridY * cellSizePx;
                  const zoneWidth = zone.widthCells * cellSizePx;
                  const zoneHeight = zone.heightCells * cellSizePx;
                  const zoneFootprintLabel = formatFootprintLabel(
                    zone.widthCells,
                    zone.heightCells,
                    activeDocument.plan.cellSizeMm,
                    activeDocument.plan.measurementSystem,
                  );
                  const visual = zoneVisuals[zone.type];
                  const selected =
                    selection.type === 'zone' && selection.ids.includes(zone.id);
                  const issue = issueEntityIds.has(zone.id);
                  const irrigationRecommendation = irrigationRecommendationMap.get(zone.id);
                  const irrigationBadgeWidth = Math.max(
                    72,
                    Math.min(zoneWidth - 16, 148),
                  );
                  const irrigationBadgeX = zoneX + (zoneWidth - irrigationBadgeWidth) / 2;
                  const irrigationBadgeY = zoneY + zoneHeight / 2 - 20;

                  return (
                    <g
                      key={zone.id}
                      onPointerDown={(event) =>
                        handleEntityPointerDown(
                          event,
                          {
                            id: zone.id,
                            gridX: zone.gridX,
                            gridY: zone.gridY,
                            widthCells: zone.widthCells,
                            heightCells: zone.heightCells,
                          },
                          'zone',
                          () => selectZone(zone.id),
                        )
                      }
                      onClick={(event) =>
                        handleEntityClick(event, () =>
                          selectZone(zone.id, isAdditiveSelection(event)),
                        )
                      }
                    >
                      {zone.shape === 'circle' ? (
                        <ellipse
                          cx={zoneX + zoneWidth / 2}
                          cy={zoneY + zoneHeight / 2}
                          fill={visual.fill}
                          rx={zoneWidth / 2}
                          ry={zoneHeight / 2}
                          stroke={issue ? '#c03a2b' : selected ? '#151a12' : visual.stroke}
                          strokeDasharray={
                            zone.type === 'pathway' || zone.type === 'trellis'
                              ? '8 6'
                              : undefined
                          }
                          strokeWidth={selected ? 3 : 2}
                        />
                      ) : (
                        <rect
                          fill={visual.fill}
                          height={zoneHeight}
                          rx={18}
                          ry={18}
                          stroke={issue ? '#c03a2b' : selected ? '#151a12' : visual.stroke}
                          strokeDasharray={
                            zone.type === 'pathway' || zone.type === 'trellis'
                              ? '8 6'
                              : undefined
                          }
                          strokeWidth={selected ? 3 : 2}
                          width={zoneWidth}
                          x={zoneX}
                          y={zoneY}
                        />
                      )}

                      {visibleLayers.labels ? (
                        <text
                          className="zone-label"
                          x={zoneX + 12}
                          y={zoneY + 24}
                        >
                          {zone.name}
                        </text>
                      ) : null}

                      {visibleLayers.measurements ? (
                        <text
                          className="measurement-label"
                          textAnchor="middle"
                          x={zoneX + zoneWidth / 2}
                          y={zoneY + zoneHeight - 12}
                        >
                          {zoneFootprintLabel}
                        </text>
                      ) : null}

                      {visibleLayers.irrigation && irrigationRecommendation ? (
                        <g className="irrigation-overlay">
                          <rect
                            className="irrigation-badge"
                            height={40}
                            rx={12}
                            ry={12}
                            width={irrigationBadgeWidth}
                            x={irrigationBadgeX}
                            y={irrigationBadgeY}
                          />
                          <text
                            className="irrigation-label"
                            textAnchor="middle"
                            x={zoneX + zoneWidth / 2}
                            y={irrigationBadgeY + 16}
                          >
                            {irrigationRecommendation.methodLabel}
                          </text>
                          <text
                            className="irrigation-label irrigation-label--secondary"
                            textAnchor="middle"
                            x={zoneX + zoneWidth / 2}
                            y={irrigationBadgeY + 30}
                          >
                            {irrigationRecommendation.summaryLabel}
                          </text>
                        </g>
                      ) : null}
                      {visibleLayers.notes && zone.notes.trim() ? (
                        (() => {
                          const noteExcerpt = toNoteExcerpt(zone.notes, 30);
                          const noteWidth = Math.max(
                            84,
                            Math.min(zoneWidth - 12, 46 + noteExcerpt.length * 6),
                          );
                          const noteX = zoneX + Math.max(6, zoneWidth - noteWidth - 6);
                          const noteY = zoneY + 8;

                          return (
                            <g className="note-overlay">
                              <rect
                                className="note-badge"
                                fill={noteBadgeColors.fill}
                                height={32}
                                rx={12}
                                ry={12}
                                stroke={noteBadgeColors.stroke}
                                strokeWidth={1}
                                width={noteWidth}
                                x={noteX}
                                y={noteY}
                              />
                              <text className="note-label" x={noteX + 10} y={noteY + 21}>
                                {`Note: ${noteExcerpt}`}
                              </text>
                            </g>
                          );
                        })()
                      ) : null}
                    </g>
                  );
                })
              : null}

            {visibleLayers.plants
              ? activeDocument.placements.map((placement) => {
                  const plant = plantDefinitions.find(
                    (entry) => entry.id === placement.plantDefinitionId,
                  );
                  const selected =
                    selection.type === 'placement' &&
                    selection.ids.includes(placement.id);
                  const issue = placementHasIssue(placement, issueEntityIds);
                  const placementPosition = getDraggedPosition(
                    'placement',
                    placement.id,
                    placement.gridX,
                    placement.gridY,
                  );
                  const x = placementPosition.gridX * cellSizePx;
                  const y = placementPosition.gridY * cellSizePx;
                  const width = placement.footprintWidthCells * cellSizePx;
                  const height = placement.footprintHeightCells * cellSizePx;

                  return (
                    <g
                      key={placement.id}
                      onPointerDown={(event) =>
                        handleEntityPointerDown(
                          event,
                          {
                            id: placement.id,
                            gridX: placement.gridX,
                            gridY: placement.gridY,
                            widthCells: placement.footprintWidthCells,
                            heightCells: placement.footprintHeightCells,
                          },
                          'placement',
                          () => selectPlacement(placement.id),
                        )
                      }
                      onClick={(event) =>
                        handleEntityClick(event, () =>
                          selectPlacement(placement.id, isAdditiveSelection(event)),
                        )
                      }
                    >
                      <rect
                        fill={plantColor(plant)}
                        height={height}
                        opacity={0.9}
                        rx={16}
                        ry={16}
                        stroke={issue ? '#c03a2b' : selected ? '#151a12' : '#20402a'}
                        strokeWidth={selected ? 3 : 2}
                        width={width}
                        x={x}
                        y={y}
                      />
                      <text className="plant-label" x={x + 10} y={y + 24}>
                        {plant?.commonName ?? 'Plant'}
                      </text>
                      {visibleLayers.notes && placement.notes.trim() ? (
                        (() => {
                          const noteExcerpt = toNoteExcerpt(placement.notes, 18);
                          const noteWidth = Math.max(70, Math.min(140, 36 + noteExcerpt.length * 6));
                          const noteX = x + Math.max(0, (width - noteWidth) / 2);
                          const noteY = y + height + 6;

                          return (
                            <g className="note-overlay">
                              <rect
                                className="note-badge"
                                fill={noteBadgeColors.fill}
                                height={24}
                                rx={10}
                                ry={10}
                                stroke={noteBadgeColors.stroke}
                                strokeWidth={1}
                                width={noteWidth}
                                x={noteX}
                                y={noteY}
                              />
                              <text className="note-label note-label--compact" x={noteX + 8} y={noteY + 16}>
                                {`Note: ${noteExcerpt}`}
                              </text>
                            </g>
                          );
                        })()
                      ) : null}
                    </g>
                  );
                })
              : null}

            {visibleLayers.measurements ? (
              <>
                <text
                  className="measurement-label measurement-label--plan"
                  textAnchor="middle"
                  x={widthPx / 2}
                  y={20}
                >
                  {`Plan width ${planWidthLabel}`}
                </text>
                <text
                  className="measurement-label measurement-label--plan"
                  textAnchor="end"
                  x={widthPx - 12}
                  y={heightPx - 14}
                >
                  {`Plan height ${planHeightLabel}`}
                </text>
              </>
            ) : null}
          </svg>
        </div>
      </div>
    </section>
  );
};
