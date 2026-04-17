import { describe, expect, it } from 'vitest';

import type { PlannerDocument } from '@/domain/garden/models';
import { createHistoryStore } from '@/stores/historyStore';

const makeDocument = (name: string): PlannerDocument => ({
  plan: {
    id: `plan-${name}`,
    name,
    locationLabel: '',
    notes: '',
    measurementSystem: 'imperial',
    widthCells: 10,
    heightCells: 10,
    cellSizeMm: 305,
    seasonTag: null,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:00:00.000Z',
  },
  zones: [],
  placements: [],
});

describe('historyStore', () => {
  it('tracks undo and redo snapshots', () => {
    const historyStore = createHistoryStore();
    const first = makeDocument('first');
    const second = makeDocument('second');
    const third = makeDocument('third');

    historyStore.getState().initialize(first);
    historyStore.getState().commit(second);
    historyStore.getState().commit(third);

    expect(historyStore.getState().canUndo()).toBe(true);
    expect(historyStore.getState().present?.plan.name).toBe('third');

    historyStore.getState().undo();
    expect(historyStore.getState().present?.plan.name).toBe('second');
    expect(historyStore.getState().canRedo()).toBe(true);

    historyStore.getState().redo();
    expect(historyStore.getState().present?.plan.name).toBe('third');
  });

  it('clears redo history when a new commit is added after undo', () => {
    const historyStore = createHistoryStore();

    historyStore.getState().initialize(makeDocument('first'));
    historyStore.getState().commit(makeDocument('second'));
    historyStore.getState().undo();
    historyStore.getState().commit(makeDocument('replacement'));

    expect(historyStore.getState().canRedo()).toBe(false);
    expect(historyStore.getState().present?.plan.name).toBe('replacement');
  });
});
