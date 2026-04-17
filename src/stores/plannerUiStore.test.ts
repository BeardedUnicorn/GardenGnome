import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePlannerUiStore } from '@/stores/plannerUiStore';

const initialState = usePlannerUiStore.getState();

beforeEach(() => {
  usePlannerUiStore.setState(initialState);
});

afterEach(() => {
  usePlannerUiStore.setState(initialState);
});

describe('plannerUiStore selection', () => {
  it('supports additive zone selection and toggling', () => {
    usePlannerUiStore.getState().selectZone('zone-1');
    usePlannerUiStore.getState().selectZone('zone-2', true);

    expect(usePlannerUiStore.getState().selection).toEqual({
      type: 'zone',
      id: 'zone-2',
      ids: ['zone-1', 'zone-2'],
    });

    usePlannerUiStore.getState().selectZone('zone-1', true);

    expect(usePlannerUiStore.getState().selection).toEqual({
      type: 'zone',
      id: 'zone-2',
      ids: ['zone-2'],
    });

    usePlannerUiStore.getState().selectZone('zone-2', true);

    expect(usePlannerUiStore.getState().selection).toEqual({
      type: 'plan',
      id: null,
      ids: [],
    });
  });

  it('replaces the selection when switching entity type', () => {
    usePlannerUiStore.getState().selectZone('zone-1');
    usePlannerUiStore.getState().selectPlacement('placement-1', true);

    expect(usePlannerUiStore.getState().selection).toEqual({
      type: 'placement',
      id: 'placement-1',
      ids: ['placement-1'],
    });
  });
});
