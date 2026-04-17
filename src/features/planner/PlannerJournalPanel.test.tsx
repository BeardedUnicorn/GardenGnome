import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GardenJournalEntry, PlannerDocument } from '@/domain/garden/models';
import { PlannerJournalPanel } from '@/features/planner/PlannerJournalPanel';
import { useGardenStore } from '@/stores/gardenStore';

const activeDocument: PlannerDocument = {
  plan: {
    id: 'plan-1',
    name: 'Kitchen Garden',
    locationLabel: 'Home',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 12,
    heightCells: 10,
    cellSizeMm: 305,
    seasonTag: '2026',
    seasonFamilyId: 'plan-1',
    sourcePlanId: null,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [],
  placements: [],
};

const journalEntry: GardenJournalEntry = {
  id: 'journal-1',
  gardenPlanId: 'plan-1',
  title: 'Aphids spotted on basil',
  body: 'Found a small cluster under the newest leaves.',
  observedOn: '2026-04-13',
  createdAt: '2026-04-13T08:00:00.000Z',
  updatedAt: '2026-04-13T08:00:00.000Z',
};

const initialState = useGardenStore.getState();

beforeEach(() => {
  act(() => {
    useGardenStore.setState({
      ...initialState,
      activeDocument,
      journalEntries: [journalEntry],
      saveJournalEntry: vi.fn().mockResolvedValue(undefined),
      deleteJournalEntry: vi.fn().mockResolvedValue(undefined),
    });
  });
});

afterEach(() => {
  cleanup();

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('PlannerJournalPanel', () => {
  it('renders persisted observations for the active plan', () => {
    render(<PlannerJournalPanel />);

    expect(screen.getByText('Aphids spotted on basil')).toBeInTheDocument();
    expect(
      screen.getByText(/Found a small cluster under the newest leaves/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Apr 13, 2026/i)).toBeInTheDocument();
  });

  it('creates a new observation from the journal form', async () => {
    const user = userEvent.setup();
    const saveJournalEntry = vi.fn().mockResolvedValue(undefined);

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        journalEntries: [],
        saveJournalEntry,
      });
    });

    render(<PlannerJournalPanel />);

    await user.type(screen.getByLabelText(/Observation title/i), 'Tomato trellis tightened');
    await user.type(
      screen.getByLabelText(/Observation notes/i),
      'Retied the main stems after a windy afternoon.',
    );
    fireEvent.change(screen.getByLabelText(/Observed on/i), {
      target: { value: '2026-04-14' },
    });
    await user.click(screen.getByRole('button', { name: /Add observation/i }));

    expect(saveJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tomato trellis tightened',
        body: 'Retied the main stems after a windy afternoon.',
        observedOn: '2026-04-14',
      }),
      undefined,
    );
  });

  it('deletes an observation from the journal list', async () => {
    const user = userEvent.setup();
    const deleteJournalEntry = vi.fn().mockResolvedValue(undefined);

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        deleteJournalEntry,
      });
    });

    render(<PlannerJournalPanel />);

    await user.click(screen.getByRole('button', { name: /Delete Aphids spotted on basil/i }));

    expect(deleteJournalEntry).toHaveBeenCalledWith('journal-1');
  });
});
