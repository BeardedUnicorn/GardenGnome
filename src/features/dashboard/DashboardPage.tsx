import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listSeasonFamilies } from '@/domain/garden/rotation';
import { deriveNextSeasonTag } from '@/domain/garden/seasons';
import { gardenTemplates, type GardenTemplateId } from '@/domain/garden/templates';
import { inchesToMillimeters, millimetersToInches } from '@/domain/geometry/geometry';
import { importPlannerDocument } from '@/services/planTransport';
import { useGardenStore } from '@/stores/gardenStore';

const currentSeason = String(new Date().getFullYear());

const formatCellSizeValue = (
  cellSizeMm: number,
  measurementSystem: 'imperial' | 'metric',
) =>
  measurementSystem === 'imperial'
    ? millimetersToInches(cellSizeMm)
    : cellSizeMm;

const parseCellSizeValue = (
  value: string,
  measurementSystem: 'imperial' | 'metric',
) =>
  measurementSystem === 'imperial'
    ? inchesToMillimeters(Number(value))
    : Number(value);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const settings = useGardenStore((state) => state.settings);
  const planSummaries = useGardenStore((state) => state.planSummaries);
  const createPlan = useGardenStore((state) => state.createPlan);
  const importPlanDocument = useGardenStore((state) => state.importPlanDocument);
  const duplicatePlan = useGardenStore((state) => state.duplicatePlan);
  const duplicatePlanForNextSeason = useGardenStore(
    (state) => state.duplicatePlanForNextSeason,
  );
  const deletePlan = useGardenStore((state) => state.deletePlan);
  const [formValues, setFormValues] = useState({
    name: '',
    locationLabel: '',
    widthCells: '30',
    heightCells: '20',
    measurementSystem: settings.measurementSystem,
    cellSizeMm: settings.defaultCellSizeMm,
    seasonTag: currentSeason,
  });
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const seasonFamilies = listSeasonFamilies(planSummaries);

  const handleCreatePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportError(null);
    setSubmitting(true);

    try {
      const planId = await createPlan({
        name: formValues.name,
        locationLabel: formValues.locationLabel,
        widthCells: Number(formValues.widthCells),
        heightCells: Number(formValues.heightCells),
        measurementSystem: formValues.measurementSystem,
        cellSizeMm: formValues.cellSizeMm,
        seasonTag: formValues.seasonTag.trim() || null,
      });

      navigate(`/plans/${planId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError(null);

    try {
      const imported = await importPlannerDocument();

      if (!imported) {
        return;
      }

      const planId = await importPlanDocument(
        imported.document,
        imported.plantDefinitions,
        imported.journalEntries,
        imported.seasonalTasks,
      );

      navigate(`/plans/${planId}`);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Failed to import the selected GardenGnome plan file.',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDuplicateToNextSeason = async (planId: string) => {
    const duplicatedPlanId = await duplicatePlanForNextSeason(planId);

    navigate(`/plans/${duplicatedPlanId}`);
  };

  const handleCreateFromTemplate = async (templateId: GardenTemplateId) => {
    const template = gardenTemplates.find((entry) => entry.id === templateId);

    if (!template) {
      return;
    }

    setImportError(null);
    setSubmitting(true);

    try {
      const planId = await createPlan({
        name: template.label,
        locationLabel: template.suggestedLocationLabel,
        widthCells: template.widthCells,
        heightCells: template.heightCells,
        measurementSystem: settings.measurementSystem,
        cellSizeMm: settings.defaultCellSizeMm,
        seasonTag: currentSeason,
        templateId,
      });

      navigate(`/plans/${planId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard-grid">
      <div className="card create-plan-card">
        <div className="card-heading">
          <p className="eyebrow">New Project</p>
          <h2>Garden Projects</h2>
          <p>
            Sketch a real yard, a raised bed cluster, or a container-focused patio
            layout without committing to the dirt yet.
          </p>
        </div>

        <form className="form-stack" onSubmit={handleCreatePlan}>
          <label className="field">
            <span>Garden name</span>
            <input
              required
              value={formValues.name}
              onChange={(event) =>
                setFormValues((state) => ({ ...state, name: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>Location</span>
            <input
              placeholder="South fence, rooftop, kitchen patio..."
              value={formValues.locationLabel}
              onChange={(event) =>
                setFormValues((state) => ({
                  ...state,
                  locationLabel: event.target.value,
                }))
              }
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Width (cells)</span>
              <input
                aria-label="Width (cells)"
                min={4}
                type="number"
                value={formValues.widthCells}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    widthCells: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Height (cells)</span>
              <input
                aria-label="Height (cells)"
                min={4}
                type="number"
                value={formValues.heightCells}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    heightCells: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Measurement system</span>
              <select
                value={formValues.measurementSystem}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    measurementSystem: event.target.value as 'imperial' | 'metric',
                  }))
                }
              >
                <option value="imperial">Imperial</option>
                <option value="metric">Metric</option>
              </select>
            </label>

            <label className="field">
              <span>
                {formValues.measurementSystem === 'imperial'
                  ? 'Cell size (inches)'
                  : 'Cell size (mm)'}
              </span>
              <input
                min={1}
                type="number"
                value={formatCellSizeValue(
                  formValues.cellSizeMm,
                  formValues.measurementSystem,
                )}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    cellSizeMm: parseCellSizeValue(
                      event.target.value,
                      state.measurementSystem,
                    ),
                  }))
                }
              />
            </label>
          </div>

          <label className="field">
            <span>Season tag</span>
            <input
              value={formValues.seasonTag}
              onChange={(event) =>
                setFormValues((state) => ({ ...state, seasonTag: event.target.value }))
              }
            />
          </label>

          <div className="button-row">
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? 'Creating…' : 'Create garden'}
            </button>
            <button
              className="button button--ghost"
              disabled={importing}
              onClick={handleImport}
              type="button"
            >
              {importing ? 'Importing…' : 'Import JSON'}
            </button>
          </div>

          {importError ? (
            <article className="issue-card" role="alert">
              <strong>Import failed</strong>
              <span>{importError}</span>
            </article>
          ) : null}
        </form>

        <div className="card-heading">
          <p className="eyebrow">Starter Templates</p>
          <h3>Start from a shaped layout</h3>
          <p>Use a built-in plan scaffold when you want a faster first pass than a blank grid.</p>
        </div>

        <div className="plan-grid">
          {gardenTemplates.map((template) => (
            <article className="plan-card" key={template.id}>
              <div>
                <p className="plan-meta">
                  {template.widthCells} × {template.heightCells} cells
                </p>
                <h3>{template.label}</h3>
                <p>{template.description}</p>
              </div>

              <div className="button-row button-row--tight">
                <button
                  className="button button--ghost"
                  disabled={submitting}
                  onClick={() => void handleCreateFromTemplate(template.id)}
                  type="button"
                >
                  {submitting ? 'Creating…' : `Use ${template.label}`}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="card projects-card">
        <div className="card-heading">
          <p className="eyebrow">Project Shelf</p>
          <h2>Existing Gardens</h2>
          <p>Open a plan, duplicate a season, or clear a stale experiment.</p>
        </div>

        {seasonFamilies.length === 0 ? (
          <div className="empty-state">
            <h3>No gardens yet</h3>
            <p>
              Start with a fresh layout or import a JSON snapshot from another
              GardenGnome install.
            </p>
          </div>
        ) : (
          <div className="season-family-grid">
            {seasonFamilies.map((family) => (
              <section className="season-family-card" key={family.familyId}>
                <div className="card-heading">
                  <p className="plan-meta">{family.locationLabel || 'Unlabeled space'}</p>
                  <h3>{family.familyName}</h3>
                  <p className="inline-note">
                    {family.seasons.length} saved seasons • Latest season:{' '}
                    {family.latest.seasonTag || 'No season tag'}
                  </p>
                </div>

                <div className="season-family-list">
                  {[...family.seasons].reverse().map((plan) => (
                    <article
                      className={`plan-card ${
                        plan.id === family.latest.id ? 'plan-card--latest' : ''
                      }`}
                      key={plan.id}
                    >
                      <div>
                        <p className="plan-meta">
                          {plan.seasonTag || 'Unscheduled season'}
                          {plan.id === family.latest.id ? ' • latest' : ''}
                        </p>
                        <h4>{plan.name}</h4>
                        <p className="plan-footprint">
                          {plan.widthCells} × {plan.heightCells} cells
                        </p>
                      </div>

                      <div className="button-row button-row--tight">
                        <button
                          aria-label={`Open ${family.familyName} ${plan.seasonTag || plan.name}`}
                          className="button button--primary"
                          onClick={() => navigate(`/plans/${plan.id}`)}
                          type="button"
                        >
                          Open {plan.seasonTag || plan.name}
                        </button>
                        <button
                          className="button button--ghost"
                          onClick={() => void duplicatePlan(plan.id)}
                          type="button"
                        >
                          Duplicate
                        </button>
                        <button
                          className="button button--ghost"
                          onClick={() => void handleDuplicateToNextSeason(plan.id)}
                          type="button"
                        >
                          Next season
                        </button>
                        <button
                          className="button button--ghost"
                          onClick={() => void deletePlan(plan.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="inline-note">
                        Next season: {deriveNextSeasonTag(plan.seasonTag)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
