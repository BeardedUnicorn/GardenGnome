import { startTransition, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildCompanionSuggestions } from '@/domain/garden/companions';
import type { PlannerDocument } from '@/domain/garden/models';
import { buildSeasonalityGuidance } from '@/domain/garden/seasonalityGuidance';
import {
  buildSeasonPlanComparison,
  buildRotationGuidance,
  buildRotationSnapshot,
  getSeasonFamilyContext,
} from '@/domain/garden/rotation';
import { getGardenRepository } from '@/repositories/repositoryFactory';
import { useGardenStore } from '@/stores/gardenStore';
import { usePlannerUiStore } from '@/stores/plannerUiStore';

const formatSeasonLabel = (seasonTag: string | null, fallback: string) =>
  seasonTag?.trim() || fallback;

const formatList = (items: string[], emptyState: string) =>
  items.length > 0 ? items.join(', ') : emptyState;

interface PlannerSeasonPanelProps {
  referenceMonth?: number;
}

export const PlannerSeasonPanel = ({
  referenceMonth = new Date().getMonth() + 1,
}: PlannerSeasonPanelProps) => {
  const navigate = useNavigate();
  const activeDocument = useGardenStore((state) => state.activeDocument);
  const planSummaries = useGardenStore((state) => state.planSummaries);
  const plantDefinitions = useGardenStore((state) => state.plantDefinitions);
  const saveSeasonalTask = useGardenStore((state) => state.saveSeasonalTask);
  const selectZone = usePlannerUiStore((state) => state.selectZone);
  const selectPlacement = usePlannerUiStore((state) => state.selectPlacement);
  const armPlant = usePlannerUiStore((state) => state.armPlant);
  const [comparisonState, setComparisonState] = useState<{
    sourcePlanId: string | null;
    document: PlannerDocument | null;
    error: string | null;
  }>({
    sourcePlanId: null,
    document: null,
    error: null,
  });
  const [comparisonPlanIdOverride, setComparisonPlanIdOverride] = useState<string | null>(null);

  const seasonContext = useMemo(
    () =>
      activeDocument
        ? getSeasonFamilyContext(planSummaries, activeDocument.plan.id)
        : null,
    [activeDocument, planSummaries],
  );
  const comparisonOptions = useMemo(
    () =>
      seasonContext
        ? seasonContext.seasons.filter((plan) => plan.id !== seasonContext.current.id)
        : [],
    [seasonContext],
  );
  const selectedComparisonPlanId = useMemo(() => {
    if (comparisonOptions.length === 0) {
      return null;
    }

    if (
      comparisonPlanIdOverride &&
      comparisonOptions.some((plan) => plan.id === comparisonPlanIdOverride)
    ) {
      return comparisonPlanIdOverride;
    }

    return (
      seasonContext?.previous?.id ??
      comparisonOptions.at(-1)?.id ??
      comparisonOptions[0]?.id ??
      null
    );
  }, [comparisonOptions, comparisonPlanIdOverride, seasonContext?.previous?.id]);
  const selectedComparisonPlan =
    comparisonOptions.find((plan) => plan.id === selectedComparisonPlanId) ?? null;

  useEffect(() => {
    let cancelled = false;

    if (!selectedComparisonPlan) {
      return () => {
        cancelled = true;
      };
    }

    void getGardenRepository()
      .getPlanDocument(selectedComparisonPlan.id)
      .then((document) => {
        if (cancelled) {
          return;
        }

        if (!document) {
          setComparisonState({
            sourcePlanId: selectedComparisonPlan.id,
            document: null,
            error: 'Selected season snapshot could not be loaded.',
          });
          return;
        }

        setComparisonState({
          sourcePlanId: selectedComparisonPlan.id,
          document,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setComparisonState({
          sourcePlanId: selectedComparisonPlan.id,
          document: null,
          error:
            error instanceof Error
              ? error.message
              : 'Selected season snapshot could not be loaded.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedComparisonPlan]);

  const previousDocument =
    comparisonState.sourcePlanId === selectedComparisonPlan?.id
      ? comparisonState.document
      : null;
  const comparisonError =
    comparisonState.sourcePlanId === selectedComparisonPlan?.id
      ? comparisonState.error
      : null;
  const loading = Boolean(
    selectedComparisonPlan &&
      previousDocument === null &&
      comparisonError === null,
  );

  const rotationSnapshot = useMemo(
    () =>
      activeDocument && previousDocument
        ? buildRotationSnapshot(activeDocument, previousDocument, plantDefinitions)
        : null,
    [activeDocument, plantDefinitions, previousDocument],
  );
  const seasonComparison = useMemo(
    () =>
      activeDocument && previousDocument
        ? buildSeasonPlanComparison(activeDocument, previousDocument, plantDefinitions)
        : null,
    [activeDocument, plantDefinitions, previousDocument],
  );
  const companionSuggestions = useMemo(
    () =>
      activeDocument
        ? buildCompanionSuggestions(activeDocument, plantDefinitions, referenceMonth)
        : [],
    [activeDocument, plantDefinitions, referenceMonth],
  );
  const seasonalityGuidance = useMemo(
    () =>
      activeDocument
        ? buildSeasonalityGuidance(activeDocument, plantDefinitions, referenceMonth)
        : [],
    [activeDocument, plantDefinitions, referenceMonth],
  );
  const rotationGuidance = useMemo(
    () => (rotationSnapshot ? buildRotationGuidance(rotationSnapshot) : []),
    [rotationSnapshot],
  );
  const plantDefinitionsById = useMemo(
    () => new Map(plantDefinitions.map((plant) => [plant.id, plant])),
    [plantDefinitions],
  );

  if (!activeDocument || !seasonContext) {
    return null;
  }

  const addWorkbenchTask = async (
    title: string,
    note: string,
    plantDefinitionId: string | null = null,
    kind: 'task' | 'harvest' = 'task',
    dueMonth: number | null = referenceMonth,
  ) => {
    await saveSeasonalTask({
      title,
      note,
      dueMonth,
      kind,
      plantDefinitionId,
    });
  };

  const focusPlantPlacements = (plantDefinitionId: string) => {
    const matchingPlacements = activeDocument.placements.filter(
      (placement) => placement.plantDefinitionId === plantDefinitionId,
    );

    matchingPlacements.forEach((placement, index) => {
      selectPlacement(placement.id, index > 0);
    });
  };

  return (
    <section className="card planner-season-panel">
      <div className="card-heading">
        <p className="eyebrow">Season context</p>
        <h3>Rotation snapshot</h3>
        <p>
          Track how this plan family changes across saved seasons before you
          commit the next round of crops.
        </p>
      </div>

      <div className="planner-season-panel__timeline">
        <div className="summary-chip">
          <strong>Family</strong>
          <span>{seasonContext.familyName}</span>
        </div>
        <div className="summary-chip">
          <strong>Current season</strong>
          <span>
            {formatSeasonLabel(seasonContext.current.seasonTag, seasonContext.current.name)}
          </span>
        </div>
        <div className="summary-chip">
          <strong>Saved seasons</strong>
          <span>{seasonContext.seasons.length}</span>
        </div>
      </div>

      {comparisonOptions.length > 0 ? (
        <label className="field">
          <span>Compare against</span>
          <select
            value={selectedComparisonPlanId ?? ''}
            onChange={(event) => setComparisonPlanIdOverride(event.target.value)}
          >
            {comparisonOptions.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {formatSeasonLabel(plan.seasonTag, plan.name)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="button-row button-row--tight">
        {seasonContext.previous ? (
          <button
            className="button button--ghost"
            onClick={() =>
              startTransition(() => navigate(`/plans/${seasonContext.previous?.id}`))
            }
            type="button"
          >
            Open {formatSeasonLabel(seasonContext.previous.seasonTag, 'previous')}
          </button>
        ) : null}
        {seasonContext.next ? (
          <button
            className="button button--ghost"
            onClick={() =>
              startTransition(() => navigate(`/plans/${seasonContext.next?.id}`))
            }
            type="button"
          >
            Open {formatSeasonLabel(seasonContext.next.seasonTag, 'next')}
          </button>
        ) : null}
      </div>

      {comparisonOptions.length === 0 ? (
        <p className="inline-note">
          Save another season in this family to compare rotation choices.
        </p>
      ) : null}

      {loading ? (
        <p className="inline-note">Loading previous season comparison…</p>
      ) : null}

      {comparisonError ? (
        <article className="issue-card" role="alert">
          <strong>Comparison unavailable</strong>
          <span>{comparisonError}</span>
        </article>
      ) : null}

      {rotationSnapshot && !loading && !comparisonError ? (
        <div className="issue-list planner-season-panel__comparison">
          <article className="issue-card">
            <strong>Repeated crops</strong>
            <span>
              {formatList(
                rotationSnapshot.repeatedCrops,
                'No crops repeat from the previous saved season.',
              )}
            </span>
          </article>
          <article className="issue-card">
            <strong>Repeated families</strong>
            <span>
              {formatList(
                rotationSnapshot.repeatedFamilies,
                'No plant families repeat from the previous saved season.',
              )}
            </span>
          </article>
          <article className="issue-card">
            <strong>Added this season</strong>
            <span>
              {formatList(
                rotationSnapshot.addedCrops,
                'No new crop types were added this season.',
              )}
            </span>
          </article>
          <article className="issue-card">
            <strong>Resting from last season</strong>
            <span>
              {formatList(
                rotationSnapshot.retiredCrops,
                'No crop types were retired from the previous season.',
              )}
            </span>
          </article>
        </div>
      ) : null}

      {seasonComparison && !loading && !comparisonError ? (
        <>
          <div className="planner-season-panel__guidance">
            <h4>Zone shifts</h4>
            <div className="issue-list planner-season-panel__comparison">
              {seasonComparison.zoneChanges.length > 0 ? (
                seasonComparison.zoneChanges.map((change) => (
                  <article className="issue-card" key={change.key}>
                    <strong>{change.zoneName}</strong>
                    <span>{change.note}</span>
                    {change.currentZoneId ? (
                      <div className="button-row button-row--tight">
                        <button
                          aria-label={`Select zone ${change.zoneName}`}
                          className="button button--ghost"
                          onClick={() => selectZone(change.currentZoneId!)}
                          type="button"
                        >
                          Select zone
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="issue-card">
                  <strong>No zone shifts</strong>
                  <span>This season keeps the same zones and crop groupings.</span>
                </article>
              )}
            </div>
          </div>

          <div className="planner-season-panel__guidance">
            <h4>Crop shifts</h4>
            <div className="issue-list planner-season-panel__comparison">
              {seasonComparison.cropChanges.length > 0 ? (
                seasonComparison.cropChanges.map((change) => (
                  <article className="issue-card" key={change.key}>
                    <strong>{change.cropLabel}</strong>
                    <span>{change.note}</span>
                    {change.currentPlantDefinitionId ? (
                      <div className="button-row button-row--tight">
                        <button
                          aria-label={`Focus crop ${change.cropLabel}`}
                          className="button button--ghost"
                          onClick={() => focusPlantPlacements(change.currentPlantDefinitionId!)}
                          type="button"
                        >
                          Focus crop
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="issue-card">
                  <strong>No crop shifts</strong>
                  <span>This season keeps the same crops in the same places.</span>
                </article>
              )}
            </div>
          </div>
        </>
      ) : null}

      {rotationGuidance.length > 0 ? (
        <div className="planner-season-panel__guidance">
          <h4>Rotation cautions</h4>
          <div className="issue-list planner-season-panel__comparison">
            {rotationGuidance.map((guidance) => (
              <article className="issue-card" key={guidance.key}>
                <strong>{guidance.title}</strong>
                <span>{guidance.note}</span>
                <div className="button-row button-row--tight">
                  <button
                    aria-label={`Add workbench task ${guidance.title}`}
                    className="button button--ghost"
                    onClick={() => void addWorkbenchTask(guidance.title, guidance.note)}
                    type="button"
                  >
                    Add to workbench
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {seasonalityGuidance.length > 0 ? (
        <div className="planner-season-panel__guidance">
          <h4>Seasonality cues</h4>
          <div className="issue-list planner-season-panel__comparison">
            {seasonalityGuidance.map((guidance) => (
              <article className="issue-card" key={guidance.key}>
                <strong>{guidance.title}</strong>
                <span>{guidance.note}</span>
                <div className="button-row button-row--tight">
                  {guidance.status === 'harvest' ? (
                    <button
                      aria-label={`Focus crop ${
                        plantDefinitionsById.get(guidance.plantDefinitionId)?.commonName ?? guidance.title
                      }`}
                      className="button button--ghost"
                      onClick={() => focusPlantPlacements(guidance.plantDefinitionId)}
                      type="button"
                    >
                      Focus crop
                    </button>
                  ) : guidance.status !== 'succession' ? (
                    <button
                      aria-label={`Arm crop ${
                        plantDefinitionsById.get(guidance.plantDefinitionId)?.commonName ?? guidance.title
                      }`}
                      className="button button--ghost"
                      onClick={() => armPlant(guidance.plantDefinitionId)}
                      type="button"
                    >
                      Arm crop
                    </button>
                  ) : null}
                  <button
                    aria-label={`Add workbench task ${guidance.title}`}
                    className="button button--ghost"
                    onClick={() =>
                      void addWorkbenchTask(
                        guidance.title,
                        guidance.note,
                        guidance.plantDefinitionId,
                        guidance.status === 'harvest' ? 'harvest' : 'task',
                        guidance.dueMonth ?? referenceMonth,
                      )
                    }
                    type="button"
                  >
                    Add to workbench
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {companionSuggestions.length > 0 ? (
        <div className="planner-season-panel__guidance">
          <h4>Companion guidance</h4>
          <div className="issue-list planner-season-panel__comparison">
            {companionSuggestions.map((suggestion) => (
              <article className="issue-card" key={suggestion.key}>
                <strong>{suggestion.title}</strong>
                <span>{suggestion.note}</span>
                <div className="button-row button-row--tight">
                  {suggestion.status === 'suggested' && suggestion.missingPlantDefinitionId ? (
                    <button
                      aria-label={`Place ${suggestion.plants[1] ?? 'companion'} in ${suggestion.zoneName}`}
                      className="button button--ghost"
                      onClick={() => {
                        selectZone(suggestion.zoneId);
                        armPlant(suggestion.missingPlantDefinitionId);
                      }}
                      type="button"
                    >
                      Place companion
                    </button>
                  ) : null}
                  <button
                    aria-label={`Select zone ${suggestion.zoneName}`}
                    className="button button--ghost"
                    onClick={() => selectZone(suggestion.zoneId)}
                    type="button"
                  >
                    Select zone
                  </button>
                </div>
                {suggestion.boundaryNotes.length > 0 ? (
                  <div className="issue-card__reasons">
                    {suggestion.boundaryNotes.map((reason) => (
                      <p className="inline-note" key={`${suggestion.key}:${reason}`}>
                        {reason}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
