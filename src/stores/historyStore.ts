import { create } from 'zustand';

import type { PlannerDocument } from '@/domain/garden/models';

interface HistoryState {
  past: PlannerDocument[];
  present: PlannerDocument | null;
  future: PlannerDocument[];
  initialize: (document: PlannerDocument) => void;
  commit: (document: PlannerDocument) => void;
  replacePresent: (document: PlannerDocument | null) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const clone = <T>(value: T): T => structuredClone(value);

export const createHistoryStore = () =>
  create<HistoryState>((set, get) => ({
    past: [],
    present: null,
    future: [],
    initialize: (document) =>
      set({
        past: [],
        present: clone(document),
        future: [],
      }),
    commit: (document) =>
      set((state) => ({
        past: state.present ? [...state.past, clone(state.present)] : state.past,
        present: clone(document),
        future: [],
      })),
    replacePresent: (document) =>
      set((state) => ({
        ...state,
        present: document ? clone(document) : null,
      })),
    undo: () =>
      set((state) => {
        const previous = state.past.at(-1);

        if (!previous || !state.present) {
          return state;
        }

        return {
          past: state.past.slice(0, -1),
          present: clone(previous),
          future: [clone(state.present), ...state.future],
        };
      }),
    redo: () =>
      set((state) => {
        const next = state.future[0];

        if (!next || !state.present) {
          return state;
        }

        return {
          past: [...state.past, clone(state.present)],
          present: clone(next),
          future: state.future.slice(1),
        };
      }),
    clear: () =>
      set({
        past: [],
        present: null,
        future: [],
      }),
    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }));

export const useHistoryStore = createHistoryStore();
