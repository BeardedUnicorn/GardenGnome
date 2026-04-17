import { useEffect, useEffectEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getSeasonFamilyContext } from '@/domain/garden/rotation';
import { exportPrintablePlannerDocument } from '@/services/plannerPrint';
import { exportPlannerSeasonPacket } from '@/services/plannerSeasonPacket';
import { exportPlannerDocument } from '@/services/planTransport';
import { getGardenRepository } from '@/repositories/repositoryFactory';
import { useGardenStore } from '@/stores/gardenStore';
import { useHistoryStore } from '@/stores/historyStore';
import { PlannerCanvas } from '@/features/planner/PlannerCanvas';
import { PlannerInspector } from '@/features/planner/PlannerInspector';
import { PlannerJournalPanel } from '@/features/planner/PlannerJournalPanel';
import { PlannerSeasonPanel } from '@/features/planner/PlannerSeasonPanel';
import { PlannerSeasonWorkbench } from '@/features/planner/PlannerSeasonWorkbench';
import { PlannerSidebar } from '@/features/planner/PlannerSidebar';
import { usePlannerUiStore } from '@/stores/plannerUiStore';
import { useViewportStore } from '@/stores/viewportStore';

export const PlannerPage = () => {
  const navigate = useNavigate();
  const { planId } = useParams();
  const activeDocument = useGardenStore((state) => state.activeDocument);
  const settings = useGardenStore((state) => state.settings);
  const dirty = useGardenStore((state) => state.dirty);
  const validationIssues = useGardenStore((state) => state.validationIssues);
  const activePlanId = useGardenStore((state) => state.activePlanId);
  const plantDefinitions = useGardenStore((state) => state.plantDefinitions);
  const planSummaries = useGardenStore((state) => state.planSummaries);
  const journalEntries = useGardenStore((state) => state.journalEntries);
  const seasonalTasks = useGardenStore((state) => state.seasonalTasks);
  const loadPlan = useGardenStore((state) => state.loadPlan);
  const saveActiveDocument = useGardenStore((state) => state.saveActiveDocument);
  const undo = useGardenStore((state) => state.undo);
  const redo = useGardenStore((state) => state.redo);
  const selectZone = usePlannerUiStore((state) => state.selectZone);
  const selectPlacement = usePlannerUiStore((state) => state.selectPlacement);
  const scale = useViewportStore((state) => state.scale);
  const zoomBy = useViewportStore((state) => state.zoomBy);
  const resetViewport = useViewportStore((state) => state.reset);
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);

  useEffect(() => {
    if (planId && planId !== activePlanId) {
      void loadPlan(planId);
    }
  }, [activePlanId, loadPlan, planId]);

  const runAutosave = useEffectEvent(() => {
    void saveActiveDocument();
  });

  useEffect(() => {
    if (!settings.autosaveEnabled || !dirty || !activeDocument) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => runAutosave(),
      settings.autosaveIntervalSeconds * 1000,
    );

    return () => window.clearTimeout(timeoutId);
  }, [
    activeDocument,
    dirty,
    settings.autosaveEnabled,
    settings.autosaveIntervalSeconds,
  ]);

  if (!activeDocument || activeDocument.plan.id !== planId) {
    return (
      <section className="planner-loading">
        <div className="card">
          <p className="eyebrow">Planner</p>
          <h2>Loading planner workspace</h2>
          <p>Opening zones, plant placements, and validation overlays.</p>
        </div>
      </section>
    );
  }

  const handleExportSeasonPacket = async () => {
    const seasonContext = getSeasonFamilyContext(planSummaries, activeDocument.plan.id);
    const comparisonDocument = seasonContext?.previous
      ? await getGardenRepository().getPlanDocument(seasonContext.previous.id)
      : null;

    await exportPlannerSeasonPacket({
      plannerDocument: activeDocument,
      planSummaries,
      comparisonDocument,
      plantDefinitions,
      validationIssues,
      journalEntries,
      seasonalTasks,
    });
  };

  const zoneIds = new Set(activeDocument.zones.map((zone) => zone.id));
  const placementIds = new Set(activeDocument.placements.map((placement) => placement.id));

  const selectIssueEntities = (entityIds: string[], type: 'zone' | 'placement') => {
    [...new Set(entityIds)].forEach((entityId, index) => {
      if (type === 'zone') {
        selectZone(entityId, index > 0);
        return;
      }

      selectPlacement(entityId, index > 0);
    });
  };

  return (
    <section className="planner-layout">
      <div className="planner-toolbar card">
        <div>
          <p className="eyebrow">Live project</p>
          <h2>Planner Workspace</h2>
          <p className="inline-note">
            {activeDocument.plan.name} •{' '}
            {activeDocument.plan.locationLabel || 'Unlabeled space'} •{' '}
            {activeDocument.plan.widthCells} × {activeDocument.plan.heightCells} cells
          </p>
        </div>

        <div className="button-row">
          <Link className="button button--ghost" to="/">
            Back to shelf
          </Link>
          <button
            className="button button--ghost"
            onClick={() => resetViewport()}
            type="button"
          >
            Reset view
          </button>
          <button className="button button--ghost" onClick={() => zoomBy(-0.15)} type="button">
            Zoom -
          </button>
          <button className="button button--ghost" onClick={() => zoomBy(0.15)} type="button">
            Zoom +
          </button>
          <button className="button button--ghost" disabled={!canUndo} onClick={undo} type="button">
            Undo
          </button>
          <button className="button button--ghost" disabled={!canRedo} onClick={redo} type="button">
            Redo
          </button>
          <button
            className="button button--ghost"
            onClick={() => void handleExportSeasonPacket()}
            type="button"
          >
            Season packet
          </button>
          <button
            className="button button--ghost"
            onClick={() =>
              void exportPrintablePlannerDocument(
                activeDocument,
                plantDefinitions,
                validationIssues,
                journalEntries,
                seasonalTasks,
              )
            }
            type="button"
          >
            Print sheet
          </button>
          <button
            className="button button--ghost"
            onClick={() =>
              void exportPlannerDocument(
                activeDocument,
                plantDefinitions,
                journalEntries,
                seasonalTasks,
              )
            }
            type="button"
          >
            Export
          </button>
          <button
            className="button button--primary"
            disabled={!dirty}
            onClick={() => void saveActiveDocument()}
            type="button"
          >
            {dirty ? 'Save now' : 'Saved'}
          </button>
        </div>

        <div className="planner-toolbar__meta">
          <span>Scale {Math.round(scale * 100)}%</span>
          <span>Shift-click to multi-select zones or plants.</span>
          <button
            className="text-button"
            onClick={() => navigate('/settings')}
            type="button"
          >
            Planner defaults
          </button>
        </div>
      </div>

      <PlannerSeasonWorkbench />
      <PlannerSeasonPanel />
      <PlannerJournalPanel />

      {validationIssues.length > 0 ? (
        <div className="issue-list">
          {validationIssues.map((issue, index) => {
            const relatedZoneIds = [...new Set(issue.entityIds.filter((entityId) => zoneIds.has(entityId)))];
            const relatedPlacementIds = [
              ...new Set(issue.entityIds.filter((entityId) => placementIds.has(entityId))),
            ];

            return (
              <article className="issue-card" key={`${issue.code}-${index}`}>
                <strong>{issue.code.replace(/-/g, ' ')}</strong>
                <span>{issue.message}</span>
                {relatedZoneIds.length > 0 || relatedPlacementIds.length > 0 ? (
                  <div className="button-row button-row--tight">
                    {relatedZoneIds.length > 0 ? (
                      <button
                        aria-label={`Select zones for ${issue.code.replace(/-/g, ' ')}`}
                        className="button button--ghost"
                        onClick={() => selectIssueEntities(relatedZoneIds, 'zone')}
                        type="button"
                      >
                        {relatedZoneIds.length === 1 ? 'Select zone' : 'Select zones'}
                      </button>
                    ) : null}
                    {relatedPlacementIds.length > 0 ? (
                      <button
                        aria-label={`Select plants for ${issue.code.replace(/-/g, ' ')}`}
                        className="button button--ghost"
                        onClick={() => selectIssueEntities(relatedPlacementIds, 'placement')}
                        type="button"
                      >
                        {relatedPlacementIds.length === 1 ? 'Select plant' : 'Select plants'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      <div className="planner-grid-layout">
        <PlannerSidebar />
        <PlannerCanvas />
        <PlannerInspector />
      </div>
    </section>
  );
};
