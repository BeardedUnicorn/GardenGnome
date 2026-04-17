import { isTauri } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

import {
  buildRotationGuidance,
  buildRotationSnapshot,
  buildSeasonPlanComparison,
  getSeasonFamilyContext,
} from '@/domain/garden/rotation';
import type {
  GardenJournalEntry,
  GardenPlanSummary,
  PlannerDocument,
  SeasonalTask,
  ValidationIssue,
} from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatSeasonLabel = (seasonTag: string | null, fallback: string) =>
  seasonTag?.trim() || fallback;

const formatObservedOn = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));

const formatDueMonth = (month: number | null) =>
  month === null
    ? 'Any time'
    : new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
        new Date(Date.UTC(2026, month - 1, 1)),
      );

const formatPlantLabel = (plant: PlantDefinition) =>
  plant.varietyName?.trim()
    ? `${plant.commonName} · ${plant.varietyName.trim()}`
    : plant.commonName;

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

const buildListMarkup = (items: string[], emptyState: string) =>
  items.length > 0
    ? `<ul>${items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : `<p class="empty">${escapeHtml(emptyState)}</p>`;

const buildIssueMarkup = (title: string, body: string) => `
  <article class="issue">
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(body)}</p>
  </article>
`;

const buildTimelineMarkup = (planSummaries: GardenPlanSummary[], currentPlanId: string) =>
  planSummaries
    .map(
      (plan) => `
        <article class="timeline-step${plan.id === currentPlanId ? ' timeline-step--current' : ''}">
          <strong>${escapeHtml(formatSeasonLabel(plan.seasonTag, plan.name))}</strong>
          <span>${escapeHtml(plan.name)}</span>
        </article>
      `,
    )
    .join('');

const buildJournalMarkup = (journalEntries: GardenJournalEntry[]) =>
  journalEntries.length > 0
    ? journalEntries
        .slice()
        .sort(
          (left, right) =>
            right.observedOn.localeCompare(left.observedOn) ||
            right.updatedAt.localeCompare(left.updatedAt),
        )
        .map((entry) =>
          buildIssueMarkup(
            entry.title,
            `${formatObservedOn(entry.observedOn)} • ${entry.body}`,
          ),
        )
        .join('')
    : '<p class="empty">No field notes are attached to this season yet.</p>';

const buildTaskMarkup = (seasonalTasks: SeasonalTask[]) =>
  seasonalTasks.length > 0
    ? seasonalTasks
        .map((task) =>
          buildIssueMarkup(
            task.title,
            `${taskKindLabels[task.kind]} • ${taskStatusLabels[task.status]} • Due ${formatDueMonth(task.dueMonth)} • ${task.note}`,
          ),
        )
        .join('')
    : '<p class="empty">No workbench tasks are attached to this season yet.</p>';

const buildWarningMarkup = (validationIssues: ValidationIssue[]) =>
  validationIssues.length > 0
    ? validationIssues
        .map((issue) => buildIssueMarkup(issue.code.replace(/-/g, ' '), issue.message))
        .join('')
    : '<p class="empty">No advisory warnings are active for this plan.</p>';

export interface PlannerSeasonPacketOptions {
  plannerDocument: PlannerDocument;
  planSummaries: GardenPlanSummary[];
  comparisonDocument: PlannerDocument | null;
  plantDefinitions?: PlantDefinition[];
  validationIssues?: ValidationIssue[];
  journalEntries?: GardenJournalEntry[];
  seasonalTasks?: SeasonalTask[];
}

const formatSeasonPacketFilename = (
  plannerDocument: PlannerDocument,
  familyName: string,
) =>
  `${slugify(familyName || plannerDocument.plan.name) || 'garden-plan'}-${
    slugify(plannerDocument.plan.seasonTag ?? 'current-season') || 'current-season'
  }-season-packet.html`;

export const serializePlannerSeasonPacket = ({
  plannerDocument,
  planSummaries,
  comparisonDocument,
  plantDefinitions = [],
  validationIssues = [],
  journalEntries = [],
  seasonalTasks = [],
}: PlannerSeasonPacketOptions) => {
  const seasonContext = getSeasonFamilyContext(planSummaries, plannerDocument.plan.id);
  const familyName = seasonContext?.familyName ?? plannerDocument.plan.name;
  const familyTimeline = seasonContext?.seasons ?? [
    {
      id: plannerDocument.plan.id,
      name: plannerDocument.plan.name,
      locationLabel: plannerDocument.plan.locationLabel,
      measurementSystem: plannerDocument.plan.measurementSystem,
      widthCells: plannerDocument.plan.widthCells,
      heightCells: plannerDocument.plan.heightCells,
      cellSizeMm: plannerDocument.plan.cellSizeMm,
      seasonTag: plannerDocument.plan.seasonTag,
      seasonFamilyId: plannerDocument.plan.seasonFamilyId,
      sourcePlanId: plannerDocument.plan.sourcePlanId,
      updatedAt: plannerDocument.plan.updatedAt,
    },
  ];
  const currentJournalEntries = journalEntries.filter(
    (entry) => entry.gardenPlanId === plannerDocument.plan.id,
  );
  const currentSeasonalTasks = seasonalTasks.filter(
    (task) => task.gardenPlanId === plannerDocument.plan.id,
  );
  const placedPlantCount = new Set(
    plannerDocument.placements.map((placement) => placement.plantDefinitionId),
  ).size;
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));
  const currentCrops = [...new Set(
    plannerDocument.placements.map(
      (placement) => formatPlantLabel(plantMap.get(placement.plantDefinitionId) ?? {
        id: placement.plantDefinitionId,
        commonName: placement.plantDefinitionId,
        varietyName: '',
        category: 'herb',
        lifecycle: 'annual',
        spacingMm: 0,
        spreadMm: 0,
        heightMm: 0,
        sunRequirement: 'fullSun',
        waterRequirement: 'moderate',
        daysToMaturity: 0,
        plantFamily: '',
        plantingWindowStartMonth: null,
        plantingWindowEndMonth: null,
        successionIntervalDays: null,
        notes: '',
        isFavorite: false,
        isCustom: false,
        createdAt: plannerDocument.plan.createdAt,
        updatedAt: plannerDocument.plan.updatedAt,
      }),
    ),
  )];
  const rotationSnapshot = comparisonDocument
    ? buildRotationSnapshot(plannerDocument, comparisonDocument, plantDefinitions)
    : null;
  const rotationGuidance = rotationSnapshot
    ? buildRotationGuidance(rotationSnapshot)
    : [];
  const seasonComparison = comparisonDocument
    ? buildSeasonPlanComparison(plannerDocument, comparisonDocument, plantDefinitions)
    : null;
  const comparisonLabel =
    comparisonDocument && seasonContext?.previous
      ? `${formatSeasonLabel(
          plannerDocument.plan.seasonTag,
          plannerDocument.plan.name,
        )} compared with ${formatSeasonLabel(
          seasonContext.previous.seasonTag,
          seasonContext.previous.name,
        )}`
      : 'No comparison snapshot is attached to this packet yet.';
  const generatedAt = new Date().toISOString();
  const filename = formatSeasonPacketFilename(plannerDocument, familyName);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(familyName)} Season Packet</title>
    <style>
      :root {
        color-scheme: light;
        --paper: #f5f0e5;
        --card: rgba(255, 252, 246, 0.94);
        --ink: #1f2817;
        --muted: #6d6a60;
        --accent: #48643f;
        --line: #d7cfbf;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(126, 155, 103, 0.18), transparent 38%),
          linear-gradient(180deg, #efe6d6 0%, #f8f5ee 42%, #f2ecdf 100%);
        color: var(--ink);
        font-family: Georgia, 'Times New Roman', serif;
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 40px 32px 56px;
      }
      header, section { margin-bottom: 24px; }
      h1, h2, h3 { margin: 0; font-weight: 600; }
      h1 { font-size: 44px; line-height: 1; }
      h2 { font-size: 24px; }
      h3 { font-size: 18px; }
      p { margin: 0; }
      .eyebrow {
        margin-bottom: 10px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 12px;
        font-family: system-ui, sans-serif;
      }
      .lede {
        margin-top: 14px;
        font-size: 18px;
        line-height: 1.5;
        color: #384534;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 20px;
        box-shadow: 0 14px 40px rgba(76, 64, 42, 0.08);
      }
      .meta-grid, .summary-grid, .comparison-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }
      .timeline {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px;
      }
      .timeline-step {
        background: rgba(238, 231, 217, 0.7);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 14px;
        display: grid;
        gap: 6px;
        font-family: system-ui, sans-serif;
      }
      .timeline-step--current {
        background: rgba(123, 150, 95, 0.18);
        border-color: rgba(72, 100, 63, 0.4);
      }
      .label {
        display: block;
        margin-bottom: 8px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-family: system-ui, sans-serif;
      }
      .value {
        font-size: 20px;
      }
      .layout {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 24px;
      }
      .issue-list {
        display: grid;
        gap: 12px;
      }
      .issue {
        border-left: 4px solid #b46a4d;
        padding-left: 12px;
      }
      .issue strong {
        display: block;
        margin-bottom: 4px;
        font-family: system-ui, sans-serif;
        text-transform: capitalize;
      }
      ul {
        margin: 12px 0 0;
        padding-left: 18px;
      }
      li {
        margin: 6px 0;
      }
      .empty {
        color: var(--muted);
        font-family: system-ui, sans-serif;
      }
      footer {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: var(--muted);
        font-size: 13px;
        font-family: system-ui, sans-serif;
      }
      @media print {
        body { background: #fff; }
        main { padding: 20px 18px 24px; }
        .card { box-shadow: none; break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">Season Share Packet</p>
        <h1>${escapeHtml(familyName)}</h1>
        <p class="lede">${escapeHtml(
          plannerDocument.plan.notes ||
            plannerDocument.plan.locationLabel ||
            'A season-family summary prepared in GardenGnome.',
        )}</p>
      </header>

      <section class="meta-grid">
        <article class="card"><span class="label">Current season</span><div class="value">${escapeHtml(
          formatSeasonLabel(plannerDocument.plan.seasonTag, plannerDocument.plan.name),
        )}</div></article>
        <article class="card"><span class="label">Location</span><div class="value">${escapeHtml(
          plannerDocument.plan.locationLabel || 'Unlabeled space',
        )}</div></article>
        <article class="card"><span class="label">Saved seasons</span><div class="value">${
          familyTimeline.length
        }</div></article>
        <article class="card"><span class="label">Prepared</span><div class="value">${escapeHtml(
          generatedAt,
        )}</div></article>
      </section>

      <section class="card">
        <p class="eyebrow">Family timeline</p>
        <h2>Saved season snapshots</h2>
        <div class="timeline">
          ${buildTimelineMarkup(familyTimeline, plannerDocument.plan.id)}
        </div>
      </section>

      <section class="summary-grid">
        <article class="card"><span class="label">Zones</span><div class="value">${
          plannerDocument.zones.length
        }</div></article>
        <article class="card"><span class="label">Placements</span><div class="value">${
          plannerDocument.placements.length
        }</div></article>
        <article class="card"><span class="label">Placed crops</span><div class="value">${placedPlantCount}</div></article>
        <article class="card"><span class="label">Warnings</span><div class="value">${
          validationIssues.length
        }</div></article>
      </section>

      <section class="layout">
        <article class="card">
          <p class="eyebrow">Current crops</p>
          <h2>What this season is carrying</h2>
          ${buildListMarkup(currentCrops, 'No crops are placed in this season yet.')}
        </article>
        <article class="card">
          <p class="eyebrow">Comparison snapshot</p>
          <h2>Season-over-season view</h2>
          <p>${escapeHtml(comparisonLabel)}</p>
        </article>
      </section>

      ${
        rotationSnapshot
          ? `<section class="comparison-grid">
              <article class="card"><span class="label">Repeated families</span><div class="value">${
                rotationSnapshot.repeatedFamilies.length
              }</div>${buildListMarkup(
                rotationSnapshot.repeatedFamilies,
                'No repeated families from the previous saved season.',
              )}</article>
              <article class="card"><span class="label">Repeated crops</span><div class="value">${
                rotationSnapshot.repeatedCrops.length
              }</div>${buildListMarkup(
                rotationSnapshot.repeatedCrops,
                'No direct crop repeats from the previous saved season.',
              )}</article>
              <article class="card"><span class="label">Added crops</span><div class="value">${
                rotationSnapshot.addedCrops.length
              }</div>${buildListMarkup(
                rotationSnapshot.addedCrops,
                'No new crop types were added this season.',
              )}</article>
              <article class="card"><span class="label">Resting crops</span><div class="value">${
                rotationSnapshot.retiredCrops.length
              }</div>${buildListMarkup(
                rotationSnapshot.retiredCrops,
                'No crop types were retired from the previous saved season.',
              )}</article>
            </section>`
          : ''
      }

      ${
        rotationGuidance.length > 0
          ? `<section class="card issue-list">
              <p class="eyebrow">Rotation cautions</p>
              <h2>What to watch next</h2>
              ${rotationGuidance
                .map((guidance) => buildIssueMarkup(guidance.title, guidance.note))
                .join('')}
            </section>`
          : ''
      }

      ${
        seasonComparison
          ? `<section class="layout">
              <article class="card">
                <p class="eyebrow">Zone shifts</p>
                <h2>Footprint changes</h2>
                <div class="issue-list">
                  ${
                    seasonComparison.zoneChanges.length > 0
                      ? seasonComparison.zoneChanges
                          .map((change) => buildIssueMarkup(change.zoneName, change.note))
                          .join('')
                      : '<p class="empty">No zone shifts are recorded between these saved seasons.</p>'
                  }
                </div>
              </article>
              <article class="card">
                <p class="eyebrow">Crop shifts</p>
                <h2>Crop movements</h2>
                <div class="issue-list">
                  ${
                    seasonComparison.cropChanges.length > 0
                      ? seasonComparison.cropChanges
                          .map((change) => buildIssueMarkup(change.cropLabel, change.note))
                          .join('')
                      : '<p class="empty">No crop shifts are recorded between these saved seasons.</p>'
                  }
                </div>
              </article>
            </section>`
          : ''
      }

      <section class="layout">
        <article class="card">
          <p class="eyebrow">Warnings</p>
          <h2>Advisory issues</h2>
          <div class="issue-list">
            ${buildWarningMarkup(validationIssues)}
          </div>
        </article>
        <article class="card">
          <p class="eyebrow">Workbench</p>
          <h2>Season tasks</h2>
          <div class="issue-list">
            ${buildTaskMarkup(currentSeasonalTasks)}
          </div>
        </article>
      </section>

      <section class="card">
        <p class="eyebrow">Journal</p>
        <h2>Field observations</h2>
        <div class="issue-list">
          ${buildJournalMarkup(currentJournalEntries)}
        </div>
      </section>

      <footer>
        <span>Prepared in GardenGnome for season review and sharing.</span>
        <span>${escapeHtml(filename)}</span>
      </footer>
    </main>
  </body>
</html>`;
};

export const exportPlannerSeasonPacket = async (
  options: PlannerSeasonPacketOptions,
) => {
  const payload = serializePlannerSeasonPacket(options);
  const seasonContext = getSeasonFamilyContext(
    options.planSummaries,
    options.plannerDocument.plan.id,
  );
  const filename = formatSeasonPacketFilename(
    options.plannerDocument,
    seasonContext?.familyName ?? options.plannerDocument.plan.name,
  );

  if (isTauri()) {
    const target = await save({
      defaultPath: filename,
      filters: [{ name: 'GardenGnome Season Packet', extensions: ['html'] }],
    });

    if (!target) {
      return;
    }

    await writeTextFile(target, payload);
    return;
  }

  const blob = new Blob([payload], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
