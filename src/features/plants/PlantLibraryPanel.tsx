import { useDeferredValue, useState, type DragEvent } from 'react';

import { zonePresets } from '@/domain/garden/presets';
import {
  growablePlantZoneTypes,
  serializePlantReferenceNames,
} from '@/domain/plants/compatibility';
import type { PlantDefinition } from '@/domain/plants/models';
import {
  formatPlantingWindow,
  isPlantInPlantingMonth,
  plantingMonthOptions,
} from '@/domain/plants/seasonality';
import { setDraggedPlantId } from '@/features/plants/drag';
import { type PlantDefinitionDraft, useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const parseOptionalNumber = (value: string) =>
  value.trim() === '' ? null : Number(value);

const createPlantDraft = (plant?: PlantDefinition): PlantDefinitionDraft => ({
  commonName: plant?.commonName ?? '',
  varietyName: plant?.varietyName ?? '',
  plantFamily: plant?.plantFamily ?? '',
  category: plant?.category ?? 'herb',
  lifecycle: plant?.lifecycle ?? 'annual',
  spacingMm: plant?.spacingMm ?? 305,
  spreadMm: plant?.spreadMm ?? 305,
  heightMm: plant?.heightMm ?? 305,
  sunRequirement: plant?.sunRequirement ?? 'fullSun',
  waterRequirement: plant?.waterRequirement ?? 'moderate',
  daysToMaturity: plant?.daysToMaturity ?? 60,
  plantingWindowStartMonth: plant?.plantingWindowStartMonth ?? null,
  plantingWindowEndMonth: plant?.plantingWindowEndMonth ?? null,
  successionIntervalDays: plant?.successionIntervalDays ?? null,
  companionPlantNames: serializePlantReferenceNames(plant?.companionPlantNames),
  conflictPlantNames: serializePlantReferenceNames(plant?.conflictPlantNames),
  preferredZoneTypes: [...(plant?.preferredZoneTypes ?? [])],
  notes: plant?.notes ?? '',
  isFavorite: plant?.isFavorite ?? false,
});

interface PlantLibraryPanelProps {
  placementEnabled?: boolean;
  rootClassName?: string;
  heading?: string;
  description?: string;
}

export const PlantLibraryPanel = ({
  placementEnabled = true,
  rootClassName = 'sidebar-section sidebar-section--scroll',
  heading = placementEnabled ? 'Choose and place crops' : 'Manage your crop catalog',
  description = placementEnabled
    ? 'Search, edit, and drag crops into the planner.'
    : 'Search, edit, and extend the plant catalog used across every garden.',
}: PlantLibraryPanelProps) => {
  const plantDefinitions = useGardenStore((state) => state.plantDefinitions);
  const savePlantDefinition = useGardenStore((state) => state.savePlantDefinition);
  const togglePlantFavorite = useGardenStore((state) => state.togglePlantFavorite);
  const deletePlantDefinition = useGardenStore((state) => state.deletePlantDefinition);
  const armedPlantId = usePlannerUiStore((state) => state.armedPlantId);
  const placementPattern = usePlannerUiStore((state) => state.placementPattern);
  const placementCount = usePlannerUiStore((state) => state.placementCount);
  const setPlacementPattern = usePlannerUiStore((state) => state.setPlacementPattern);
  const setPlacementCount = usePlannerUiStore((state) => state.setPlacementCount);
  const armPlant = usePlannerUiStore((state) => state.armPlant);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PlantDefinition['category']>(
    'all',
  );
  const [sunFilter, setSunFilter] = useState<'all' | PlantDefinition['sunRequirement']>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const [showPlantEditor, setShowPlantEditor] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const editingPlant = plantDefinitions.find((plant) => plant.id === editingPlantId) ?? null;
  const [plantDraft, setPlantDraft] = useState<PlantDefinitionDraft>(
    createPlantDraft(editingPlant ?? undefined),
  );

  const filteredPlants = plantDefinitions.filter((plant) => {
    const query = deferredSearch.trim().toLowerCase();
    const matchesMetadata =
      (categoryFilter === 'all' || plant.category === categoryFilter) &&
      (sunFilter === 'all' || plant.sunRequirement === sunFilter) &&
      (monthFilter === 'all' || isPlantInPlantingMonth(plant, Number(monthFilter))) &&
      (!favoritesOnly || plant.isFavorite);

    if (!query) {
      return matchesMetadata;
    }

    return (
      `${plant.commonName} ${plant.varietyName} ${plant.plantFamily ?? ''} ${plant.notes}`
        .toLowerCase()
        .includes(query) && matchesMetadata
    );
  });

  const startEditingPlant = (plant?: PlantDefinition) => {
    setEditingPlantId(plant?.id ?? null);
    setPlantDraft(createPlantDraft(plant));
    setShowPlantEditor(true);
  };

  const handlePlantDragStart = (event: DragEvent<HTMLElement>, plantId: string) => {
    if (!placementEnabled) {
      return;
    }

    setDraggedPlantId(event, plantId);
  };

  const handlePlantDragEnd = () => {
    if (placementEnabled) {
      armPlant(null);
    }
  };

  return (
    <div className={rootClassName}>
      <div className="card-heading">
        <p className="eyebrow">Plant library</p>
        <h3>{heading}</h3>
        <p>{description}</p>
      </div>

      <label className="field">
        <span>Search plants</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Category filter</span>
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as typeof categoryFilter)
            }
          >
            <option value="all">All categories</option>
            <option value="herb">Herb</option>
            <option value="leafy">Leafy</option>
            <option value="root">Root</option>
            <option value="fruiting">Fruiting</option>
            <option value="flower">Flower</option>
            <option value="perennial">Perennial</option>
          </select>
        </label>

        <label className="field">
          <span>Sun filter</span>
          <select
            value={sunFilter}
            onChange={(event) => setSunFilter(event.target.value as typeof sunFilter)}
          >
            <option value="all">Any light</option>
            <option value="fullSun">Full sun</option>
            <option value="partSun">Part sun</option>
            <option value="shade">Shade</option>
          </select>
        </label>

        <label className="field">
          <span>Planting month</span>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Any month</option>
            {plantingMonthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field field--checkbox">
        <input
          checked={favoritesOnly}
          onChange={(event) => setFavoritesOnly(event.target.checked)}
          type="checkbox"
        />
        <span>Favorites only</span>
      </label>

      <div className="button-row button-row--tight">
        <button
          className="button button--ghost"
          onClick={() => startEditingPlant(undefined)}
          type="button"
        >
          Add custom plant
        </button>
        {placementEnabled && armedPlantId ? (
          <button className="button button--ghost" onClick={() => armPlant(null)} type="button">
            Clear placement
          </button>
        ) : null}
      </div>

      {placementEnabled ? (
        <div className="plant-editor">
          <div className="card-heading">
            <p className="eyebrow">Placement helper</p>
            <h3>Single, row, cluster, or fill</h3>
          </div>

          <div className="button-row button-row--tight">
            {(['single', 'row', 'cluster', 'fill'] as const).map((pattern) => (
              <button
                className={`button ${
                  placementPattern === pattern ? 'button--primary' : 'button--ghost'
                }`}
                key={pattern}
                onClick={() => setPlacementPattern(pattern)}
                type="button"
              >
                {pattern}
              </button>
            ))}
          </div>

          {placementPattern === 'single' ? (
            <p className="inline-note">
              Drag a crop card onto the canvas or arm it for click placement.
            </p>
          ) : placementPattern === 'fill' ? (
            <p className="inline-note">
              Click or drop inside a growable zone to fill it with spaced footprints.
            </p>
          ) : (
            <label className="field">
              <span>
                {placementPattern === 'row' ? 'Plants per row' : 'Plants per cluster'}
              </span>
              <input
                max={12}
                min={2}
                type="number"
                value={placementCount}
                onChange={(event) => setPlacementCount(Number(event.target.value))}
              />
            </label>
          )}
        </div>
      ) : null}

      {showPlantEditor ? (
        <form
          className="plant-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void savePlantDefinition(plantDraft, editingPlant?.id ?? undefined);
            setEditingPlantId(null);
            setPlantDraft(createPlantDraft());
            setShowPlantEditor(false);
          }}
        >
          <label className="field">
            <span>Common name</span>
            <input
              required
              value={plantDraft.commonName}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  commonName: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Variety</span>
            <input
              value={plantDraft.varietyName}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  varietyName: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Plant family</span>
            <input
              value={plantDraft.plantFamily}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  plantFamily: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Companion plant names</span>
            <textarea
              rows={2}
              value={plantDraft.companionPlantNames}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  companionPlantNames: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Conflict plant names</span>
            <textarea
              rows={2}
              value={plantDraft.conflictPlantNames}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  conflictPlantNames: event.target.value,
                }))
              }
            />
          </label>

          <div className="field">
            <span>Preferred zone types</span>
            <div className="field-grid">
              {growablePlantZoneTypes.map((zoneType) => (
                <label className="field field--checkbox" key={zoneType}>
                  <input
                    checked={plantDraft.preferredZoneTypes?.includes(zoneType) ?? false}
                    onChange={(event) =>
                      setPlantDraft((state) => ({
                        ...state,
                        preferredZoneTypes: event.target.checked
                          ? [...(state.preferredZoneTypes ?? []), zoneType]
                          : (state.preferredZoneTypes ?? []).filter(
                              (value) => value !== zoneType,
                            ),
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{zonePresets[zoneType].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Category</span>
              <select
                value={plantDraft.category}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    category: event.target.value as PlantDefinition['category'],
                  }))
                }
              >
                <option value="herb">Herb</option>
                <option value="leafy">Leafy</option>
                <option value="root">Root</option>
                <option value="fruiting">Fruiting</option>
                <option value="flower">Flower</option>
                <option value="perennial">Perennial</option>
              </select>
            </label>

            <label className="field">
              <span>Lifecycle</span>
              <select
                value={plantDraft.lifecycle}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    lifecycle: event.target.value as PlantDefinition['lifecycle'],
                  }))
                }
              >
                <option value="annual">Annual</option>
                <option value="perennial">Perennial</option>
                <option value="biennial">Biennial</option>
              </select>
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Spacing (mm)</span>
              <input
                min={50}
                type="number"
                value={plantDraft.spacingMm}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    spacingMm: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Days to maturity</span>
              <input
                min={1}
                type="number"
                value={plantDraft.daysToMaturity}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    daysToMaturity: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Spread (mm)</span>
              <input
                min={50}
                type="number"
                value={plantDraft.spreadMm}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    spreadMm: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Height (mm)</span>
              <input
                min={50}
                type="number"
                value={plantDraft.heightMm}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    heightMm: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Sun requirement</span>
              <select
                value={plantDraft.sunRequirement}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    sunRequirement: event.target.value as PlantDefinition['sunRequirement'],
                  }))
                }
              >
                <option value="fullSun">Full sun</option>
                <option value="partSun">Part sun</option>
                <option value="shade">Shade</option>
              </select>
            </label>

            <label className="field">
              <span>Water requirement</span>
              <select
                value={plantDraft.waterRequirement}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    waterRequirement: event.target.value as PlantDefinition['waterRequirement'],
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Planting window start</span>
              <select
                value={plantDraft.plantingWindowStartMonth?.toString() ?? ''}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    plantingWindowStartMonth: parseOptionalNumber(event.target.value),
                  }))
                }
              >
                <option value="">Any month</option>
                {plantingMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Planting window end</span>
              <select
                value={plantDraft.plantingWindowEndMonth?.toString() ?? ''}
                onChange={(event) =>
                  setPlantDraft((state) => ({
                    ...state,
                    plantingWindowEndMonth: parseOptionalNumber(event.target.value),
                  }))
                }
              >
                <option value="">Any month</option>
                {plantingMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Succession interval (days)</span>
            <input
              min={1}
              type="number"
              value={plantDraft.successionIntervalDays ?? ''}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  successionIntervalDays: parseOptionalNumber(event.target.value),
                }))
              }
            />
          </label>

          <label className="field field--checkbox">
            <input
              checked={plantDraft.isFavorite}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  isFavorite: event.target.checked,
                }))
              }
              type="checkbox"
            />
            <span>Favorite plant</span>
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              rows={3}
              value={plantDraft.notes}
              onChange={(event) =>
                setPlantDraft((state) => ({
                  ...state,
                  notes: event.target.value,
                }))
              }
            />
          </label>

          <div className="button-row button-row--tight">
            <button className="button button--primary" type="submit">
              {editingPlant ? 'Save plant' : 'Create plant'}
            </button>
            <button
              className="button button--ghost"
              onClick={() => {
                setEditingPlantId(null);
                setPlantDraft(createPlantDraft());
                setShowPlantEditor(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="plant-list">
        {filteredPlants.map((plant) => {
          const plantingWindow = formatPlantingWindow(plant);
          const seasonalNotes = [
            plantingWindow ? `Plant ${plantingWindow}` : null,
            plant.successionIntervalDays
              ? `Succession every ${plant.successionIntervalDays} days`
              : null,
          ]
            .filter(Boolean)
            .join(' • ');

          return (
            <article
              className="plant-card"
              draggable={placementEnabled}
              key={plant.id}
              onDragEnd={() => handlePlantDragEnd()}
              onDragStart={(event) => handlePlantDragStart(event, plant.id)}
            >
              <div>
                <p className="plant-card__meta">
                  {plant.category} • {plant.lifecycle}
                  {plant.isFavorite ? ' • favorite' : ''}
                </p>
                <h4>
                  {plant.commonName}
                  {plant.varietyName ? ` · ${plant.varietyName}` : ''}
                </h4>
                <p>
                  {plant.sunRequirement} light • {plant.waterRequirement} water •{' '}
                  {plant.spacingMm} mm spacing
                </p>
                {plant.plantFamily ? <p>{plant.plantFamily}</p> : null}
                {seasonalNotes ? <p>{seasonalNotes}</p> : null}
                <p>{plant.notes}</p>
              </div>

              <div className="button-row button-row--tight">
                {placementEnabled ? (
                  <button
                    className={`button ${
                      armedPlantId === plant.id ? 'button--primary' : 'button--ghost'
                    }`}
                    onClick={() => armPlant(armedPlantId === plant.id ? null : plant.id)}
                    type="button"
                  >
                    {armedPlantId === plant.id ? `Armed · ${placementPattern}` : 'Place'}
                  </button>
                ) : null}
                <button
                  aria-label={`${plant.isFavorite ? 'Unfavorite' : 'Favorite'} ${plant.commonName}`}
                  className="button button--ghost"
                  onClick={() => void togglePlantFavorite(plant.id)}
                  type="button"
                >
                  {plant.isFavorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <button
                  className="button button--ghost"
                  onClick={() => startEditingPlant(plant)}
                  type="button"
                >
                  Edit
                </button>
                {plant.isCustom ? (
                  <button
                    className="button button--ghost"
                    onClick={() => void deletePlantDefinition(plant.id)}
                    type="button"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
