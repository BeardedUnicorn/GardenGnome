import { useState } from 'react';

import type { GardenJournalEntry } from '@/domain/garden/models';
import { useGardenStore } from '@/stores/gardenStore';

interface JournalEntryDraft {
  title: string;
  body: string;
  observedOn: string;
}

const createDraft = (entry?: GardenJournalEntry | null): JournalEntryDraft => ({
  title: entry?.title ?? '',
  body: entry?.body ?? '',
  observedOn: entry?.observedOn ?? new Date().toISOString().slice(0, 10),
});

const formatObservedOn = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));

export const PlannerJournalPanel = () => {
  const activeDocument = useGardenStore((state) => state.activeDocument);
  const journalEntries = useGardenStore((state) => state.journalEntries);
  const saveJournalEntry = useGardenStore((state) => state.saveJournalEntry);
  const deleteJournalEntry = useGardenStore((state) => state.deleteJournalEntry);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const editingEntry =
    journalEntries.find((entry) => entry.id === editingEntryId) ?? null;
  const [draft, setDraft] = useState<JournalEntryDraft>(createDraft());

  if (!activeDocument) {
    return null;
  }

  return (
    <section className="card planner-journal-panel">
      <div className="card-heading">
        <p className="eyebrow">Garden journal</p>
        <h3>Field observations</h3>
        <p>
          Capture what changed in this plan while it is still fresh: pests,
          harvests, weather impact, or next-step notes.
        </p>
      </div>

      <form
        className="planner-journal-panel__form plant-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void saveJournalEntry(draft, editingEntry?.id ?? undefined);
          setEditingEntryId(null);
          setDraft(createDraft());
        }}
      >
        <label className="field">
          <span>Observation title</span>
          <input
            required
            value={draft.title}
            onChange={(event) =>
              setDraft((state) => ({ ...state, title: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Observation notes</span>
          <textarea
            required
            rows={3}
            value={draft.body}
            onChange={(event) =>
              setDraft((state) => ({ ...state, body: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Observed on</span>
          <input
            required
            type="date"
            value={draft.observedOn}
            onChange={(event) =>
              setDraft((state) => ({ ...state, observedOn: event.target.value }))
            }
          />
        </label>

        <div className="button-row button-row--tight">
          <button className="button button--primary" type="submit">
            {editingEntry ? 'Save observation' : 'Add observation'}
          </button>
          {editingEntry ? (
            <button
              className="button button--ghost"
              onClick={() => {
                setEditingEntryId(null);
                setDraft(createDraft());
              }}
              type="button"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {journalEntries.length === 0 ? (
        <div className="empty-state">
          <p className="inline-note">No observations saved for this plan yet.</p>
        </div>
      ) : (
        <div className="planner-journal-panel__entries">
          {journalEntries.map((entry) => (
            <article className="issue-card" key={entry.id}>
              <div className="planner-journal-panel__entry-header">
                <div>
                  <strong>{entry.title}</strong>
                  <p className="planner-journal-panel__entry-date">
                    {formatObservedOn(entry.observedOn)}
                  </p>
                </div>
                <div className="button-row button-row--tight">
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      setEditingEntryId(entry.id);
                      setDraft(createDraft(entry));
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    aria-label={`Delete ${entry.title}`}
                    className="button button--ghost"
                    onClick={() => void deleteJournalEntry(entry.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <span>{entry.body}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
