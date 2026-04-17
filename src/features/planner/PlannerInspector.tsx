import { useState } from 'react';

import { inchesToMillimeters, millimetersToInches } from '@/domain/geometry/geometry';
import { normalizeSunProfile } from '@/domain/garden/sun';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const nextRotationDegrees = (rotationDegrees: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 =>
  ((rotationDegrees + 90) % 360) as 0 | 90 | 180 | 270;

const clampGridCoordinate = (value: number, max: number) =>
  Math.min(Math.max(0, value), Math.max(0, max));

const rotateFootprint = ({
  gridX,
  gridY,
  widthCells,
  heightCells,
  rotationDegrees,
  planWidthCells,
  planHeightCells,
}: {
  gridX: number;
  gridY: number;
  widthCells: number;
  heightCells: number;
  rotationDegrees: 0 | 90 | 180 | 270;
  planWidthCells: number;
  planHeightCells: number;
}) => {
  const nextWidthCells = heightCells;
  const nextHeightCells = widthCells;

  return {
    gridX: clampGridCoordinate(gridX, planWidthCells - nextWidthCells),
    gridY: clampGridCoordinate(gridY, planHeightCells - nextHeightCells),
    widthCells: nextWidthCells,
    heightCells: nextHeightCells,
    rotationDegrees: nextRotationDegrees(rotationDegrees),
  };
};

const MultiZoneSelectionEditor = ({
  selectedCount,
  onApplyNotes,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  selectedCount: number;
  onApplyNotes: (notes: string) => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="form-stack">
      <div className="summary-chip">{selectedCount} zones selected</div>
      <p className="inline-note">Bulk edits apply across the selected zones.</p>
      <label className="field">
        <span>Shared notes</span>
        <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="button-row button-row--tight">
        <button className="button button--ghost" onClick={() => onApplyNotes(notes)} type="button">
          Apply notes to selected zones
        </button>
        <button className="button button--ghost" onClick={onRotate} type="button">
          Rotate selected zones 90°
        </button>
        <button className="button button--ghost" onClick={onDuplicate} type="button">
          Duplicate selected zones
        </button>
        <button className="button button--ghost" onClick={onDelete} type="button">
          Delete selected zones
        </button>
      </div>
    </div>
  );
};

const MultiPlacementSelectionEditor = ({
  defaultQuantity,
  selectedCount,
  onApplyEdits,
  onRotate,
  onDuplicate,
  onDelete,
}: {
  defaultQuantity: number;
  selectedCount: number;
  onApplyEdits: (notes: string, quantity: string) => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const [quantity, setQuantity] = useState(String(defaultQuantity));
  const [notes, setNotes] = useState('');

  return (
    <div className="form-stack">
      <div className="summary-chip">{selectedCount} plant placements selected</div>
      <p className="inline-note">Shared edits apply to every selected crop footprint.</p>
      <label className="field">
        <span>Shared quantity</span>
        <input min={1} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </label>
      <label className="field">
        <span>Shared notes</span>
        <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="button-row button-row--tight">
        <button
          className="button button--ghost"
          onClick={() => onApplyEdits(notes, quantity)}
          type="button"
        >
          Apply edits to selected placements
        </button>
        <button className="button button--ghost" onClick={onRotate} type="button">
          Rotate selected plants 90°
        </button>
        <button className="button button--ghost" onClick={onDuplicate} type="button">
          Duplicate selected placements
        </button>
        <button className="button button--ghost" onClick={onDelete} type="button">
          Delete selected placements
        </button>
      </div>
    </div>
  );
};

export const PlannerInspector = () => {
  const activeDocument = useGardenStore((state) => state.activeDocument);
  const plantDefinitions = useGardenStore((state) => state.plantDefinitions);
  const updatePlan = useGardenStore((state) => state.updatePlan);
  const updateZones = useGardenStore((state) => state.updateZones);
  const updateZone = useGardenStore((state) => state.updateZone);
  const duplicateZone = useGardenStore((state) => state.duplicateZone);
  const duplicateZones = useGardenStore((state) => state.duplicateZones);
  const removeZone = useGardenStore((state) => state.removeZone);
  const removeZones = useGardenStore((state) => state.removeZones);
  const updatePlacements = useGardenStore((state) => state.updatePlacements);
  const updatePlacement = useGardenStore((state) => state.updatePlacement);
  const duplicatePlacement = useGardenStore((state) => state.duplicatePlacement);
  const duplicatePlacements = useGardenStore((state) => state.duplicatePlacements);
  const removePlacement = useGardenStore((state) => state.removePlacement);
  const removePlacements = useGardenStore((state) => state.removePlacements);
  const selection = usePlannerUiStore((state) => state.selection);

  if (!activeDocument) {
    return null;
  }

  const selectedZoneIds = selection.type === 'zone' ? selection.ids : [];
  const selectedZones =
    selection.type === 'zone'
      ? activeDocument.zones.filter((zone) => selectedZoneIds.includes(zone.id))
      : [];
  const selectedZone = selectedZones[0] ?? null;
  const hasMultipleZones = selectedZones.length > 1;
  const selectedPlacementIds = selection.type === 'placement' ? selection.ids : [];
  const selectedPlacements =
    selection.type === 'placement'
      ? activeDocument.placements.filter((placement) =>
          selectedPlacementIds.includes(placement.id),
        )
      : [];
  const selectedPlacement = selectedPlacements[0] ?? null;
  const hasMultiplePlacements = selectedPlacements.length > 1;
  const zoneSelectionKey = selectedZoneIds.join('|');
  const placementSelectionKey = selectedPlacementIds.join('|');
  const selectedPlant = plantDefinitions.find(
    (plant) => plant.id === selectedPlacement?.plantDefinitionId,
  );
  const planCellSizeLabel =
    activeDocument.plan.measurementSystem === 'imperial'
      ? 'Cell size (inches)'
      : 'Cell size (mm)';
  const planCellSizeValue =
    activeDocument.plan.measurementSystem === 'imperial'
      ? millimetersToInches(activeDocument.plan.cellSizeMm)
      : activeDocument.plan.cellSizeMm;
  const sunProfile = normalizeSunProfile(
    activeDocument.plan.sunProfile,
    activeDocument.plan.widthCells,
    activeDocument.plan.heightCells,
  );

  const applyMultiZoneNotes = (notes: string) => {
    if (selectedZones.length === 0) {
      return;
    }

    updateZones(
      selectedZones.map((zone) => ({
        zoneId: zone.id,
        patch: {
          notes,
        },
      })),
    );
  };

  const rotateSelectedZones = () => {
    if (selectedZones.length === 0) {
      return;
    }

    updateZones(
      selectedZones.map((zone) => {
        if (zone.shape !== 'rectangle') {
          return {
            zoneId: zone.id,
            patch: {},
          };
        }

        const rotated = rotateFootprint({
          gridX: zone.gridX,
          gridY: zone.gridY,
          widthCells: zone.widthCells,
          heightCells: zone.heightCells,
          rotationDegrees: zone.rotationDegrees,
          planWidthCells: activeDocument.plan.widthCells,
          planHeightCells: activeDocument.plan.heightCells,
        });

        return {
          zoneId: zone.id,
          patch: {
            gridX: rotated.gridX,
            gridY: rotated.gridY,
            widthCells: rotated.widthCells,
            heightCells: rotated.heightCells,
            rotationDegrees: rotated.rotationDegrees,
          },
        };
      }),
    );
  };

  const applyMultiPlacementEdits = (notes: string, quantity: string) => {
    if (selectedPlacements.length === 0) {
      return;
    }

    updatePlacements(
      selectedPlacements.map((placement) => ({
        placementId: placement.id,
        patch: {
          notes,
          quantity: Math.max(1, Number(quantity) || 1),
        },
      })),
    );
  };

  const rotateSelectedPlacements = () => {
    if (selectedPlacements.length === 0) {
      return;
    }

    updatePlacements(
      selectedPlacements.map((placement) => {
        const rotated = rotateFootprint({
          gridX: placement.gridX,
          gridY: placement.gridY,
          widthCells: placement.footprintWidthCells,
          heightCells: placement.footprintHeightCells,
          rotationDegrees: placement.rotationDegrees,
          planWidthCells: activeDocument.plan.widthCells,
          planHeightCells: activeDocument.plan.heightCells,
        });

        return {
          placementId: placement.id,
          patch: {
            gridX: rotated.gridX,
            gridY: rotated.gridY,
            footprintWidthCells: rotated.widthCells,
            footprintHeightCells: rotated.heightCells,
            rotationDegrees: rotated.rotationDegrees,
          },
        };
      }),
    );
  };

  return (
    <aside className="planner-inspector card">
      <div className="card-heading">
        <p className="eyebrow">Inspector</p>
        <h3>
          {selection.type === 'zone'
            ? hasMultipleZones
              ? 'Zone selection'
              : 'Zone details'
            : selection.type === 'placement'
              ? hasMultiplePlacements
                ? 'Plant selection'
                : 'Plant placement'
              : 'Plan settings'}
        </h3>
      </div>

      {selection.type === 'plan' || selection.ids.length === 0 ? (
        <div className="form-stack">
          <label className="field">
            <span>Plan name</span>
            <input
              value={activeDocument.plan.name}
              onChange={(event) => updatePlan({ name: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              value={activeDocument.plan.locationLabel}
              onChange={(event) => updatePlan({ locationLabel: event.target.value })}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>Season tag</span>
              <input
                value={activeDocument.plan.seasonTag ?? ''}
                onChange={(event) =>
                  updatePlan({ seasonTag: event.target.value.trim() || null })
                }
              />
            </label>
            <label className="field">
              <span>Measurement system</span>
              <select
                value={activeDocument.plan.measurementSystem}
                onChange={(event) =>
                  updatePlan({
                    measurementSystem: event.target.value as 'imperial' | 'metric',
                  })
                }
              >
                <option value="imperial">Imperial</option>
                <option value="metric">Metric</option>
              </select>
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Width cells</span>
              <input
                type="number"
                value={activeDocument.plan.widthCells}
                onChange={(event) =>
                  updatePlan({ widthCells: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span>Height cells</span>
              <input
                type="number"
                value={activeDocument.plan.heightCells}
                onChange={(event) =>
                  updatePlan({ heightCells: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <label className="field">
            <span>{planCellSizeLabel}</span>
            <input
              min={1}
              type="number"
              value={planCellSizeValue}
              onChange={(event) =>
                updatePlan({
                  cellSizeMm:
                    activeDocument.plan.measurementSystem === 'imperial'
                      ? inchesToMillimeters(Number(event.target.value))
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>Shade edge</span>
              <select
                value={sunProfile.shadeEdge}
                onChange={(event) =>
                  updatePlan({
                    sunProfile: normalizeSunProfile(
                      {
                        ...sunProfile,
                        shadeEdge: event.target.value as typeof sunProfile.shadeEdge,
                      },
                      activeDocument.plan.widthCells,
                      activeDocument.plan.heightCells,
                    ),
                  })
                }
              >
                <option value="north">North edge</option>
                <option value="east">East edge</option>
                <option value="south">South edge</option>
                <option value="west">West edge</option>
              </select>
            </label>
            <label className="field">
              <span>Full shade depth (cells)</span>
              <input
                min={0}
                type="number"
                value={sunProfile.shadeDepthCells}
                onChange={(event) =>
                  updatePlan({
                    sunProfile: normalizeSunProfile(
                      {
                        ...sunProfile,
                        shadeDepthCells: Number(event.target.value),
                      },
                      activeDocument.plan.widthCells,
                      activeDocument.plan.heightCells,
                    ),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Part shade depth (cells)</span>
              <input
                min={0}
                type="number"
                value={sunProfile.partShadeDepthCells}
                onChange={(event) =>
                  updatePlan({
                    sunProfile: normalizeSunProfile(
                      {
                        ...sunProfile,
                        partShadeDepthCells: Number(event.target.value),
                      },
                      activeDocument.plan.widthCells,
                      activeDocument.plan.heightCells,
                    ),
                  })
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea
              rows={5}
              value={activeDocument.plan.notes}
              onChange={(event) => updatePlan({ notes: event.target.value })}
            />
          </label>
        </div>
      ) : null}

      {hasMultipleZones ? (
        <MultiZoneSelectionEditor
          key={zoneSelectionKey}
          onApplyNotes={applyMultiZoneNotes}
          onDelete={() => removeZones(selectedZones.map((zone) => zone.id))}
          onDuplicate={() => duplicateZones(selectedZones.map((zone) => zone.id))}
          onRotate={rotateSelectedZones}
          selectedCount={selectedZones.length}
        />
      ) : null}

      {selectedZone && !hasMultipleZones ? (
        <div className="form-stack">
          <label className="field">
            <span>Name</span>
            <input
              value={selectedZone.name}
              onChange={(event) => updateZone(selectedZone.id, { name: event.target.value })}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>X</span>
              <input
                type="number"
                value={selectedZone.gridX}
                onChange={(event) =>
                  updateZone(selectedZone.id, { gridX: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span>Y</span>
              <input
                type="number"
                value={selectedZone.gridY}
                onChange={(event) =>
                  updateZone(selectedZone.id, { gridY: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Width cells</span>
              <input
                type="number"
                value={selectedZone.widthCells}
                onChange={(event) =>
                  updateZone(selectedZone.id, { widthCells: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span>Height cells</span>
              <input
                type="number"
                value={selectedZone.heightCells}
                onChange={(event) =>
                  updateZone(selectedZone.id, { heightCells: Number(event.target.value) })
                }
              />
            </label>
          </div>
          {selectedZone.shape === 'rectangle' ? (
            <div className="button-row button-row--tight">
              <span className="inline-note">{`Rotation ${selectedZone.rotationDegrees}°`}</span>
              <button
                className="button button--ghost"
                onClick={() => {
                  const rotated = rotateFootprint({
                    gridX: selectedZone.gridX,
                    gridY: selectedZone.gridY,
                    widthCells: selectedZone.widthCells,
                    heightCells: selectedZone.heightCells,
                    rotationDegrees: selectedZone.rotationDegrees,
                    planWidthCells: activeDocument.plan.widthCells,
                    planHeightCells: activeDocument.plan.heightCells,
                  });

                  updateZone(selectedZone.id, {
                    gridX: rotated.gridX,
                    gridY: rotated.gridY,
                    widthCells: rotated.widthCells,
                    heightCells: rotated.heightCells,
                    rotationDegrees: rotated.rotationDegrees,
                  });
                }}
                type="button"
              >
                Rotate zone 90°
              </button>
            </div>
          ) : null}
          <label className="field">
            <span>Notes</span>
            <textarea
              rows={4}
              value={selectedZone.notes}
              onChange={(event) => updateZone(selectedZone.id, { notes: event.target.value })}
            />
          </label>
          <div className="button-row button-row--tight">
            <button
              className="button button--ghost"
              onClick={() => duplicateZone(selectedZone.id)}
              type="button"
            >
              Duplicate zone
            </button>
            <button
              className="button button--ghost"
              onClick={() => removeZone(selectedZone.id)}
              type="button"
            >
              Delete zone
            </button>
          </div>
        </div>
      ) : null}

      {hasMultiplePlacements ? (
        <MultiPlacementSelectionEditor
          key={placementSelectionKey}
          defaultQuantity={selectedPlacement?.quantity ?? 1}
          onApplyEdits={applyMultiPlacementEdits}
          onDelete={() => removePlacements(selectedPlacements.map((placement) => placement.id))}
          onDuplicate={() =>
            duplicatePlacements(selectedPlacements.map((placement) => placement.id))
          }
          onRotate={rotateSelectedPlacements}
          selectedCount={selectedPlacements.length}
        />
      ) : null}

      {selectedPlacement && !hasMultiplePlacements ? (
        <div className="form-stack">
          <div className="summary-chip">
            {selectedPlant?.commonName ?? 'Unknown plant'}
            {selectedPlant?.varietyName ? ` · ${selectedPlant.varietyName}` : ''}
          </div>
          <div className="field-grid">
            <label className="field">
              <span>X</span>
              <input
                type="number"
                value={selectedPlacement.gridX}
                onChange={(event) =>
                  updatePlacement(selectedPlacement.id, {
                    gridX: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Y</span>
              <input
                type="number"
                value={selectedPlacement.gridY}
                onChange={(event) =>
                  updatePlacement(selectedPlacement.id, {
                    gridY: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              value={selectedPlacement.quantity}
              onChange={(event) =>
                updatePlacement(selectedPlacement.id, {
                  quantity: Number(event.target.value),
                })
              }
            />
          </label>
          <div className="button-row button-row--tight">
            <span className="inline-note">{`Rotation ${selectedPlacement.rotationDegrees}°`}</span>
            <button
              className="button button--ghost"
              onClick={() => {
                const rotated = rotateFootprint({
                  gridX: selectedPlacement.gridX,
                  gridY: selectedPlacement.gridY,
                  widthCells: selectedPlacement.footprintWidthCells,
                  heightCells: selectedPlacement.footprintHeightCells,
                  rotationDegrees: selectedPlacement.rotationDegrees,
                  planWidthCells: activeDocument.plan.widthCells,
                  planHeightCells: activeDocument.plan.heightCells,
                });

                updatePlacement(selectedPlacement.id, {
                  gridX: rotated.gridX,
                  gridY: rotated.gridY,
                  footprintWidthCells: rotated.widthCells,
                  footprintHeightCells: rotated.heightCells,
                  rotationDegrees: rotated.rotationDegrees,
                });
              }}
              type="button"
            >
              Rotate plant 90°
            </button>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea
              rows={4}
              value={selectedPlacement.notes}
              onChange={(event) =>
                updatePlacement(selectedPlacement.id, { notes: event.target.value })
              }
            />
          </label>
          <div className="button-row button-row--tight">
            <button
              className="button button--ghost"
              onClick={() => duplicatePlacement(selectedPlacement.id)}
              type="button"
            >
              Duplicate
            </button>
            <button
              className="button button--ghost"
              onClick={() => removePlacement(selectedPlacement.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
};
