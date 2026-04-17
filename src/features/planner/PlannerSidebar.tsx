import { zonePresets } from '@/domain/garden/presets';
import { PlantLibraryPanel } from '@/features/plants/PlantLibraryPanel';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const layerLabels = {
  zones: 'Zones',
  plants: 'Plants',
  labels: 'Labels',
  measurements: 'Measurements',
  notes: 'Notes',
  sunShade: 'Sun / shade',
  irrigation: 'Irrigation',
} as const;

export const PlannerSidebar = () => {
  const activePanel = usePlannerUiStore((state) => state.activePanel);
  const activeTool = usePlannerUiStore((state) => state.activeTool);
  const visibleLayers = usePlannerUiStore((state) => state.visibleLayers);
  const setActivePanel = usePlannerUiStore((state) => state.setActivePanel);
  const setActiveTool = usePlannerUiStore((state) => state.setActiveTool);
  const toggleLayer = usePlannerUiStore((state) => state.toggleLayer);

  return (
    <aside className="planner-sidebar card">
      <div className="segmented-control" role="tablist" aria-label="Planner sidebar">
        {(['tools', 'plants', 'layers'] as const).map((panel) => (
          <button
            className={`segmented-control__button ${
              activePanel === panel ? 'segmented-control__button--active' : ''
            }`}
            key={panel}
            onClick={() => setActivePanel(panel)}
            role="tab"
            type="button"
          >
            {panel}
          </button>
        ))}
      </div>

      {activePanel === 'tools' ? (
        <div className="sidebar-section">
          <div className="card-heading">
            <p className="eyebrow">Placement tools</p>
            <h3>Area palette</h3>
          </div>

          <div className="tool-grid">
            <button
              className={`tool-card ${activeTool === 'select' ? 'tool-card--active' : ''}`}
              onClick={() => setActiveTool('select')}
              type="button"
            >
              Select
            </button>
            <button
              className={`tool-card ${activeTool === 'pan' ? 'tool-card--active' : ''}`}
              onClick={() => setActiveTool('pan')}
              type="button"
            >
              Pan
            </button>
            {Object.values(zonePresets).map((preset) => (
              <button
                className={`tool-card ${activeTool === preset.type ? 'tool-card--active' : ''}`}
                key={preset.type}
                onClick={() => setActiveTool(preset.type)}
                type="button"
              >
                <span>{preset.label}</span>
                <small>
                  {preset.widthCells} × {preset.heightCells}
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activePanel === 'plants' ? <PlantLibraryPanel /> : null}

      {activePanel === 'layers' ? (
        <div className="sidebar-section">
          <div className="card-heading">
            <p className="eyebrow">Visibility</p>
            <h3>Layer toggles</h3>
          </div>

          {Object.entries(visibleLayers).map(([layer, enabled]) => (
            <label className="field field--checkbox" key={layer}>
              <input
                checked={enabled}
                onChange={() => toggleLayer(layer as keyof typeof visibleLayers)}
                type="checkbox"
              />
              <span>{layerLabels[layer as keyof typeof visibleLayers] ?? layer}</span>
            </label>
          ))}
        </div>
      ) : null}
    </aside>
  );
};
