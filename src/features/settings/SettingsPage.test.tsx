import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '@/features/settings/SettingsPage';
import { useGardenStore } from '@/stores/gardenStore';

const exportWorkspaceBackupMock = vi.fn();
const importWorkspaceBackupMock = vi.fn();

vi.mock('@/services/workspaceBackup', () => ({
  exportWorkspaceBackup: () => exportWorkspaceBackupMock(),
  importWorkspaceBackup: () => importWorkspaceBackupMock(),
}));

const initialState = useGardenStore.getState();

beforeEach(() => {
  exportWorkspaceBackupMock.mockReset();
  exportWorkspaceBackupMock.mockResolvedValue(undefined);
  importWorkspaceBackupMock.mockReset();
  importWorkspaceBackupMock.mockResolvedValue(null);

  act(() => {
    useGardenStore.setState({
      ...initialState,
      restoreWorkspaceBackup: vi.fn().mockResolvedValue(0),
    } as never);
  });
});

afterEach(() => {
  cleanup();

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('SettingsPage workspace backup tools', () => {
  it('downloads a workspace backup from settings', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /Download workspace backup/i }));

    expect(exportWorkspaceBackupMock).toHaveBeenCalledTimes(1);
  });

  it('restores a workspace backup and reports how many plans were imported', async () => {
    const user = userEvent.setup();
    const restoreWorkspaceBackup = vi.fn().mockResolvedValue(2);

    importWorkspaceBackupMock.mockResolvedValue({
      exportedAt: '2026-04-14T00:00:00.000Z',
      settings: initialState.settings,
      plantDefinitions: [],
      documents: [],
      journalEntries: [],
      seasonalTasks: [],
    });

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        restoreWorkspaceBackup,
      } as never);
    });

    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: /Import workspace backup/i }));

    expect(importWorkspaceBackupMock).toHaveBeenCalledTimes(1);
    expect(restoreWorkspaceBackup).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/restored 2 plans from the selected backup/i),
    ).toBeInTheDocument();
  });
});
