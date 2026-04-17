import { useState } from 'react';

import { inchesToMillimeters, millimetersToInches } from '@/domain/geometry/geometry';
import {
  exportWorkspaceBackup,
  importWorkspaceBackup,
} from '@/services/workspaceBackup';
import { useGardenStore } from '@/stores/gardenStore';

const themeOptions = [
  { value: 'garden-day', label: 'Garden Day' },
  { value: 'orchard-dusk', label: 'Orchard Dusk' },
  { value: 'terracotta-noon', label: 'Terracotta Noon' },
] as const;

export const SettingsPage = () => {
  const settings = useGardenStore((state) => state.settings);
  const updateSettings = useGardenStore((state) => state.updateSettings);
  const restoreWorkspaceBackup = useGardenStore((state) => state.restoreWorkspaceBackup);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const usesMetric = settings.measurementSystem === 'metric';

  const handleExportWorkspaceBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    setBackupError(null);

    try {
      await exportWorkspaceBackup();
      setBackupMessage('Workspace backup downloaded.');
    } catch (error) {
      setBackupError(
        error instanceof Error
          ? error.message
          : 'Failed to export the workspace backup.',
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportWorkspaceBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    setBackupError(null);

    try {
      const bundle = await importWorkspaceBackup();

      if (!bundle) {
        return;
      }

      const restoredPlanCount = await restoreWorkspaceBackup(bundle);
      setBackupMessage(
        `Restored ${restoredPlanCount} ${
          restoredPlanCount === 1 ? 'plan' : 'plans'
        } from the selected backup.`,
      );
    } catch (error) {
      setBackupError(
        error instanceof Error
          ? error.message
          : 'Failed to import the selected workspace backup.',
      );
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <section className="settings-layout">
      <div className="card">
        <div className="card-heading">
          <p className="eyebrow">Preferences</p>
          <h2>Settings</h2>
          <p>Default measurement system, autosave cadence, and planner visibility.</p>
        </div>

        <div className="form-stack">
          <label className="field">
            <span>Measurement system</span>
            <select
              value={settings.measurementSystem}
              onChange={(event) =>
                void updateSettings({
                  measurementSystem: event.target.value as 'imperial' | 'metric',
                })
              }
            >
              <option value="imperial">Imperial</option>
              <option value="metric">Metric</option>
            </select>
          </label>

          <label className="field">
            <span>Planner theme</span>
            <select
              value={settings.theme}
              onChange={(event) =>
                void updateSettings({
                  theme: event.target.value,
                })
              }
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{usesMetric ? 'Default cell size (mm)' : 'Default cell size (inches)'}</span>
            <input
              type="number"
              value={
                usesMetric
                  ? settings.defaultCellSizeMm
                  : millimetersToInches(settings.defaultCellSizeMm)
              }
              onChange={async (event) => {
                setSaving(true);
                await updateSettings({
                  defaultCellSizeMm: usesMetric
                    ? Number(event.target.value)
                    : inchesToMillimeters(Number(event.target.value)),
                });
                setSaving(false);
              }}
            />
          </label>

          <label className="field field--checkbox">
            <input
              checked={settings.autosaveEnabled}
              onChange={(event) =>
                void updateSettings({ autosaveEnabled: event.target.checked })
              }
              type="checkbox"
            />
            <span>Enable autosave</span>
          </label>

          <label className="field">
            <span>Autosave every (seconds)</span>
            <input
              type="number"
              value={settings.autosaveIntervalSeconds}
              onChange={(event) =>
                void updateSettings({
                  autosaveIntervalSeconds: Number(event.target.value),
                })
              }
            />
          </label>

          <label className="field field--checkbox">
            <input
              checked={settings.showGrid}
              onChange={(event) =>
                void updateSettings({ showGrid: event.target.checked })
              }
              type="checkbox"
            />
            <span>Show grid by default</span>
          </label>
        </div>

        <p className="inline-note">{saving ? 'Saving…' : 'Changes persist locally.'}</p>
      </div>

      <div className="card">
        <div className="card-heading">
          <p className="eyebrow">Workspace Safety</p>
          <h3>Templates and backups</h3>
          <p>Download a full local backup or restore a previously exported GardenGnome workspace.</p>
        </div>

        <div className="button-row">
          <button
            className="button button--ghost"
            disabled={backupBusy}
            onClick={() => void handleExportWorkspaceBackup()}
            type="button"
          >
            {backupBusy ? 'Working…' : 'Download workspace backup'}
          </button>
          <button
            className="button button--ghost"
            disabled={backupBusy}
            onClick={() => void handleImportWorkspaceBackup()}
            type="button"
          >
            {backupBusy ? 'Working…' : 'Import workspace backup'}
          </button>
        </div>

        {backupMessage ? <p className="inline-note">{backupMessage}</p> : null}

        {backupError ? (
          <article className="issue-card" role="alert">
            <strong>Backup failed</strong>
            <span>{backupError}</span>
          </article>
        ) : null}
      </div>
    </section>
  );
};
