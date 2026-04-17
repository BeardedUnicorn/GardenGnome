import { useEffect, useState, type FormEvent } from 'react';

import type { SeasonalTask } from '@/domain/garden/models';
import { plantingMonthOptions } from '@/domain/plants/seasonality';
import { useGardenStore } from '@/stores/gardenStore';

interface PlannerSeasonWorkbenchProps {
  referenceMonth?: number;
}

type SeasonalTaskStatusFilter = SeasonalTask['status'] | 'all';
type SeasonalTaskGroupBy = 'none' | 'dueMonth' | 'status' | 'kind';

interface TaskFormState {
  title: string;
  note: string;
  dueMonth: string;
  kind: SeasonalTask['kind'];
  plantDefinitionId: string;
}

const taskKindLabels = {
  plant: 'Planting',
  succession: 'Succession',
  harvest: 'Harvest',
  task: 'Task',
  watch: 'Timing',
} as const;

const taskStatusLabels = {
  pending: 'Pending',
  done: 'Done',
  skipped: 'Skipped',
} as const;

const createTaskFormState = (): TaskFormState => ({
  title: '',
  note: '',
  dueMonth: '',
  kind: 'task',
  plantDefinitionId: '',
});

const formatDueMonth = (month: number | null) =>
  plantingMonthOptions.find((option) => option.value === month)?.shortLabel ?? 'Any time';

const buildTaskGroups = (
  tasks: SeasonalTask[],
  groupBy: SeasonalTaskGroupBy,
) => {
  if (groupBy === 'none') {
    return [{ key: 'all', label: 'All tasks', tasks }];
  }

  const grouped = new Map<string, { label: string; tasks: SeasonalTask[] }>();

  tasks.forEach((task) => {
    const key =
      groupBy === 'dueMonth'
        ? String(task.dueMonth ?? 'any')
        : groupBy === 'status'
          ? task.status
          : task.kind;
    const label =
      groupBy === 'dueMonth'
        ? `Due ${formatDueMonth(task.dueMonth)}`
        : groupBy === 'status'
          ? taskStatusLabels[task.status]
          : taskKindLabels[task.kind];
    const current = grouped.get(key) ?? { label, tasks: [] };

    current.tasks.push(task);
    grouped.set(key, current);
  });

  return [...grouped.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    tasks: value.tasks,
  }));
};

export const PlannerSeasonWorkbench = ({
  referenceMonth = new Date().getMonth() + 1,
}: PlannerSeasonWorkbenchProps) => {
  const activeDocument = useGardenStore((state) => state.activeDocument);
  const plantDefinitions = useGardenStore((state) => state.plantDefinitions);
  const seasonalTasks = useGardenStore((state) => state.seasonalTasks);
  const syncSeasonalTasks = useGardenStore((state) => state.syncSeasonalTasks);
  const setSeasonalTaskStatus = useGardenStore((state) => state.setSeasonalTaskStatus);
  const saveSeasonalTask = useGardenStore((state) => state.saveSeasonalTask);
  const deleteSeasonalTask = useGardenStore((state) => state.deleteSeasonalTask);
  const [statusFilter, setStatusFilter] = useState<SeasonalTaskStatusFilter>('all');
  const [groupBy, setGroupBy] = useState<SeasonalTaskGroupBy>('none');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(createTaskFormState);

  useEffect(() => {
    if (!activeDocument) {
      return;
    }

    void syncSeasonalTasks(referenceMonth);
  }, [activeDocument, plantDefinitions, referenceMonth, syncSeasonalTasks]);

  if (!activeDocument) {
    return null;
  }

  const planTasks = seasonalTasks.filter(
    (task) => task.gardenPlanId === activeDocument.plan.id,
  );
  const filteredTasks = planTasks.filter(
    (task) => statusFilter === 'all' || task.status === statusFilter,
  );
  const groupedTasks = buildTaskGroups(filteredTasks, groupBy);
  const pendingCount = planTasks.filter((task) => task.status === 'pending').length;
  const doneCount = planTasks.filter((task) => task.status === 'done').length;
  const skippedCount = planTasks.filter((task) => task.status === 'skipped').length;
  const sortedPlants = [...plantDefinitions].sort((left, right) =>
    [left.commonName, left.varietyName]
      .filter(Boolean)
      .join(' · ')
      .localeCompare([right.commonName, right.varietyName].filter(Boolean).join(' · ')),
  );

  const resetForm = () => {
    setEditingTaskId(null);
    setTaskForm(createTaskFormState());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await saveSeasonalTask(
      {
        title: taskForm.title,
        note: taskForm.note,
        dueMonth: taskForm.dueMonth ? Number(taskForm.dueMonth) : null,
        kind: taskForm.kind,
        plantDefinitionId: taskForm.plantDefinitionId || null,
      },
      editingTaskId ?? undefined,
    );

    resetForm();
  };

  const startEditing = (task: SeasonalTask) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      note: task.note,
      dueMonth: task.dueMonth ? String(task.dueMonth) : '',
      kind: task.kind,
      plantDefinitionId: task.plantDefinitionId ?? '',
    });
  };

  const handleDelete = async (taskId: string) => {
    await deleteSeasonalTask(taskId);

    if (editingTaskId === taskId) {
      resetForm();
    }
  };

  return (
    <section className="card planner-season-workbench">
      <div className="card-heading">
        <p className="eyebrow">Season execution</p>
        <h3>Season workbench</h3>
        <p>
          Turn planting windows into a reusable checklist so each season has
          concrete next actions instead of passive reminders.
        </p>
      </div>

      <form className="form-stack planner-season-workbench__form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="field-grid">
          <label className="field">
            <span>Task title</span>
            <input
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Add a seasonal follow-up"
              type="text"
              value={taskForm.title}
            />
          </label>
          <label className="field">
            <span>Due month</span>
            <select
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, dueMonth: event.target.value }))
              }
              value={taskForm.dueMonth}
            >
              <option value="">Any time</option>
              {plantingMonthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Task type</span>
            <select
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  kind: event.target.value as SeasonalTask['kind'],
                }))
              }
              value={taskForm.kind}
            >
              <option value="task">Task</option>
              <option value="plant">Planting</option>
              <option value="succession">Succession</option>
              <option value="harvest">Harvest</option>
              <option value="watch">Timing</option>
            </select>
          </label>
          <label className="field">
            <span>Linked crop</span>
            <select
              onChange={(event) =>
                setTaskForm((current) => ({
                  ...current,
                  plantDefinitionId: event.target.value,
                }))
              }
              value={taskForm.plantDefinitionId}
            >
              <option value="">No linked crop</option>
              {sortedPlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {[plant.commonName, plant.varietyName].filter(Boolean).join(' · ')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Task notes</span>
          <textarea
            onChange={(event) =>
              setTaskForm((current) => ({ ...current, note: event.target.value }))
            }
            placeholder="Capture the seasonal detail you want to remember."
            value={taskForm.note}
          />
        </label>

        <div className="button-row planner-season-workbench__form-actions">
          <button className="button button--primary" type="submit">
            {editingTaskId ? 'Save task' : 'Add task'}
          </button>
          {editingTaskId ? (
            <button
              className="button button--ghost"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="planner-season-workbench__summary">
        <div className="summary-chip">
          <strong>Total tasks</strong>
          <span>{planTasks.length}</span>
        </div>
        <div className="summary-chip">
          <strong>Pending</strong>
          <span>{pendingCount} pending</span>
        </div>
        <div className="summary-chip">
          <strong>Completed</strong>
          <span>{doneCount} complete</span>
        </div>
        <div className="summary-chip">
          <strong>Skipped</strong>
          <span>{skippedCount} skipped</span>
        </div>
      </div>

      <div className="field-grid planner-season-workbench__controls">
        <label className="field">
          <span>Status filter</span>
          <select
            onChange={(event) =>
              setStatusFilter(event.target.value as SeasonalTaskStatusFilter)
            }
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="done">Completed</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
        <label className="field">
          <span>Task grouping</span>
          <select
            onChange={(event) =>
              setGroupBy(event.target.value as SeasonalTaskGroupBy)
            }
            value={groupBy}
          >
            <option value="none">No grouping</option>
            <option value="dueMonth">Month buckets</option>
            <option value="status">Status</option>
            <option value="kind">Task type</option>
          </select>
        </label>
      </div>

      {planTasks.length === 0 ? (
        <div className="empty-state">
          <p className="inline-note">
            Add plants with seasonal metadata or create a manual task to build a
            workbench checklist.
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <p className="inline-note">
            No tasks match the current status filter.
          </p>
        </div>
      ) : (
        <div className="planner-season-workbench__groups">
          {groupedTasks.map((group) => (
            <section className="planner-season-workbench__group" key={group.key}>
              {groupBy !== 'none' ? <h4>{group.label}</h4> : null}
              <div className="planner-season-workbench__list">
                {group.tasks.map((task) => (
                  <article className="issue-card" key={task.id}>
                    <div className="planner-season-workbench__item-header">
                      <div>
                        <strong>{task.title}</strong>
                        <div className="planner-season-workbench__meta">
                          <span>{taskKindLabels[task.kind]}</span>
                          <span>Due {formatDueMonth(task.dueMonth)}</span>
                          <span>{taskStatusLabels[task.status]}</span>
                        </div>
                      </div>

                      <div className="button-row button-row--tight">
                        {task.status !== 'done' ? (
                          <button
                            aria-label={`Done ${task.title}`}
                            className="button button--primary"
                            onClick={() => void setSeasonalTaskStatus(task.id, 'done')}
                            type="button"
                          >
                            Done
                          </button>
                        ) : null}
                        {task.status !== 'skipped' ? (
                          <button
                            aria-label={`Skip ${task.title}`}
                            className="button button--ghost"
                            onClick={() => void setSeasonalTaskStatus(task.id, 'skipped')}
                            type="button"
                          >
                            Skip
                          </button>
                        ) : null}
                        {task.status !== 'pending' ? (
                          <button
                            aria-label={`Reset ${task.title}`}
                            className="button button--ghost"
                            onClick={() => void setSeasonalTaskStatus(task.id, 'pending')}
                            type="button"
                          >
                            Reset
                          </button>
                        ) : null}
                        {!task.sourceKey ? (
                          <button
                            aria-label={`Edit ${task.title}`}
                            className="button button--ghost"
                            onClick={() => startEditing(task)}
                            type="button"
                          >
                            Edit
                          </button>
                        ) : null}
                        {!task.sourceKey ? (
                          <button
                            aria-label={`Delete ${task.title}`}
                            className="button button--ghost"
                            onClick={() => void handleDelete(task.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <span>{task.note}</span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
};
