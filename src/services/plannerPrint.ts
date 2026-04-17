import { isTauri } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

import { zonePresets } from '@/domain/garden/presets';
import type {
  GardenJournalEntry,
  PlannerDocument,
  SeasonalTask,
  ValidationIssue,
} from '@/domain/garden/models';
import { formatDistanceLabel, formatFootprintLabel } from '@/domain/geometry/geometry';
import type { PlantDefinition } from '@/domain/plants/models';

const previewCellSizePx = 28;

const zoneVisuals = {
  raisedBed: { fill: '#9b7243', stroke: '#5d3b1d' },
  inGroundBed: { fill: '#a9be7c', stroke: '#4d6322' },
  container: { fill: '#d0a170', stroke: '#9a5928' },
  herbSpiral: { fill: '#9cc684', stroke: '#547242' },
  trellis: { fill: '#d4bfaa', stroke: '#8b5a30' },
  orchardPerennial: { fill: '#a6c58b', stroke: '#4c6a37' },
  greenhouseZone: { fill: '#c4d7e2', stroke: '#53798e' },
  decorativePlantingArea: { fill: '#dfb5c3', stroke: '#9b536d' },
  compostArea: { fill: '#9d825e', stroke: '#5f4220' },
  pathway: { fill: '#d9cfbe', stroke: '#8e816b' },
} as const;

const plantColors = {
  fruiting: '#c95e45',
  leafy: '#4b7a48',
  root: '#c8873b',
  flower: '#d06b86',
  perennial: '#6d8d57',
  herb: '#4e8e6a',
} as const;

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

const formatPrintableFilename = (plannerDocument: PlannerDocument) =>
  `${slugify(plannerDocument.plan.name) || 'garden-plan'}-print.html`;

const formatPlantName = (plant?: PlantDefinition) =>
  plant
    ? [plant.commonName, plant.varietyName].filter(Boolean).join(' · ')
    : 'Unknown crop';

const formatZoneType = (type: keyof typeof zonePresets) => zonePresets[type].label;

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

const buildPlannerSvg = (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const widthPx = plannerDocument.plan.widthCells * previewCellSizePx;
  const heightPx = plannerDocument.plan.heightCells * previewCellSizePx;
  const columns = Array.from({ length: plannerDocument.plan.widthCells + 1 }, (_, index) => index);
  const rows = Array.from({ length: plannerDocument.plan.heightCells + 1 }, (_, index) => index);
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));

  return `
    <svg viewBox="0 0 ${widthPx} ${heightPx}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(
      plannerDocument.plan.name,
    )} plan preview">
      <rect width="${widthPx}" height="${heightPx}" fill="#f7f4eb" rx="20" />
      ${rows
        .map(
          (row) =>
            `<line x1="0" x2="${widthPx}" y1="${row * previewCellSizePx}" y2="${
              row * previewCellSizePx
            }" stroke="#e0d8c8" stroke-width="1" />`,
        )
        .join('')}
      ${columns
        .map(
          (column) =>
            `<line y1="0" y2="${heightPx}" x1="${column * previewCellSizePx}" x2="${
              column * previewCellSizePx
            }" stroke="#e0d8c8" stroke-width="1" />`,
        )
        .join('')}
      ${plannerDocument.zones
        .map((zone) => {
          const visual = zoneVisuals[zone.type];
          const x = zone.gridX * previewCellSizePx;
          const y = zone.gridY * previewCellSizePx;
          const width = zone.widthCells * previewCellSizePx;
          const height = zone.heightCells * previewCellSizePx;

          return `
            <g>
              ${
                zone.shape === 'circle'
                  ? `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${
                      width / 2
                    }" ry="${height / 2}" fill="${visual.fill}" fill-opacity="0.55" stroke="${
                      visual.stroke
                    }" stroke-width="2.5" />`
                  : `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${visual.fill}" fill-opacity="0.45" stroke="${visual.stroke}" stroke-width="2.5"${
                      zone.type === 'trellis' ? ' stroke-dasharray="10 6"' : ''
                    } />`
              }
              <text x="${x + 10}" y="${y + 22}" font-size="14" font-family="Georgia, serif" fill="#1f2817">${escapeHtml(
                zone.name,
              )}</text>
            </g>
          `;
        })
        .join('')}
      ${plannerDocument.placements
        .map((placement) => {
          const plant = plantMap.get(placement.plantDefinitionId);
          const x = placement.gridX * previewCellSizePx;
          const y = placement.gridY * previewCellSizePx;
          const width = placement.footprintWidthCells * previewCellSizePx;
          const height = placement.footprintHeightCells * previewCellSizePx;

          return `
            <g>
              <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${
                plant ? plantColors[plant.category] : '#5f7c63'
              }" stroke="#173122" stroke-width="2" fill-opacity="0.92" />
              <text x="${x + 8}" y="${y + 20}" font-size="12" font-family="system-ui, sans-serif" fill="#ffffff">${escapeHtml(
                plant?.commonName ?? 'Plant',
              )}</text>
            </g>
          `;
        })
        .join('')}
    </svg>
  `;
};

const buildZoneRows = (plannerDocument: PlannerDocument) =>
  plannerDocument.zones
    .map(
      (zone) => `
        <tr>
          <td>${escapeHtml(zone.name)}</td>
          <td>${escapeHtml(formatZoneType(zone.type))}</td>
          <td>${escapeHtml(
            formatFootprintLabel(
              zone.widthCells,
              zone.heightCells,
              plannerDocument.plan.cellSizeMm,
              plannerDocument.plan.measurementSystem,
            ),
          )}</td>
          <td>${zone.gridX}, ${zone.gridY}</td>
        </tr>
      `,
    )
    .join('');

const buildCropRows = (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[],
) => {
  const zoneMap = new Map(plannerDocument.zones.map((zone) => [zone.id, zone.name]));
  const plantMap = new Map(plantDefinitions.map((plant) => [plant.id, plant]));
  const grouped = new Map<
    string,
    {
      plant: PlantDefinition | undefined;
      placements: number;
      zones: Set<string>;
    }
  >();

  plannerDocument.placements.forEach((placement) => {
    const current = grouped.get(placement.plantDefinitionId) ?? {
      plant: plantMap.get(placement.plantDefinitionId),
      placements: 0,
      zones: new Set<string>(),
    };

    current.placements += placement.quantity;
    current.zones.add(
      placement.zoneId ? zoneMap.get(placement.zoneId) ?? 'Assigned zone' : 'Unassigned',
    );
    grouped.set(placement.plantDefinitionId, current);
  });

  return [...grouped.values()]
    .map(
      ({ plant, placements, zones }) => `
        <tr>
          <td>${escapeHtml(formatPlantName(plant))}</td>
          <td>${escapeHtml(plant?.category ?? 'unknown')}</td>
          <td>${placements}</td>
          <td>${escapeHtml([...zones].join(', '))}</td>
        </tr>
      `,
    )
    .join('');
};

const buildJournalEntriesMarkup = (journalEntries: GardenJournalEntry[]) =>
  [...journalEntries]
    .sort((left, right) =>
      right.observedOn.localeCompare(left.observedOn) ||
      right.updatedAt.localeCompare(left.updatedAt),
    )
    .map(
      (entry) => `
        <article class="issue">
          <strong>${escapeHtml(entry.title)}</strong>
          <p class="journal-meta">${escapeHtml(formatObservedOn(entry.observedOn))}</p>
          <p>${escapeHtml(entry.body)}</p>
        </article>
      `,
    )
    .join('');

const buildSeasonalTaskMarkup = (seasonalTasks: SeasonalTask[]) =>
  seasonalTasks
    .map(
      (task) => `
        <article class="issue">
          <strong>${escapeHtml(task.title)}</strong>
          <p class="journal-meta">${escapeHtml(
            `${taskKindLabels[task.kind]} • ${taskStatusLabels[task.status]} • Due ${formatDueMonth(task.dueMonth)}`,
          )}</p>
          <p>${escapeHtml(task.note)}</p>
        </article>
      `,
    )
    .join('');

export const serializePrintablePlannerDocument = (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[] = [],
  validationIssues: ValidationIssue[] = [],
  journalEntries: GardenJournalEntry[] = [],
  seasonalTasks: SeasonalTask[] = [],
) => {
  const planWidth = formatDistanceLabel(
    plannerDocument.plan.widthCells * plannerDocument.plan.cellSizeMm,
    plannerDocument.plan.measurementSystem,
  );
  const planHeight = formatDistanceLabel(
    plannerDocument.plan.heightCells * plannerDocument.plan.cellSizeMm,
    plannerDocument.plan.measurementSystem,
  );
  const generatedAt = new Date().toISOString();
  const cropRows = buildCropRows(plannerDocument, plantDefinitions);
  const zoneRows = buildZoneRows(plannerDocument);
  const planJournalEntries = journalEntries.filter(
    (entry) => entry.gardenPlanId === plannerDocument.plan.id,
  );
  const journalMarkup = buildJournalEntriesMarkup(planJournalEntries);
  const planSeasonalTasks = seasonalTasks.filter(
    (task) => task.gardenPlanId === plannerDocument.plan.id,
  );
  const seasonalTaskMarkup = buildSeasonalTaskMarkup(planSeasonalTasks);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(plannerDocument.plan.name)} Print Sheet</title>
    <style>
      :root {
        color-scheme: light;
        --paper: #f6f1e7;
        --ink: #1f2817;
        --muted: #6f6a5f;
        --accent: #48643f;
        --card: #fffdf8;
        --line: #d8cfbf;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #efe7d7 0%, #f9f6ef 45%, #f3eee2 100%);
        color: var(--ink);
        font-family: Georgia, 'Times New Roman', serif;
      }
      main {
        max-width: 1080px;
        margin: 0 auto;
        padding: 40px 32px 56px;
      }
      header {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 24px;
        align-items: end;
      }
      h1, h2, h3 { margin: 0; font-weight: 600; }
      h1 { font-size: 42px; line-height: 1; }
      h2 { font-size: 24px; }
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
        color: #374232;
      }
      .meta-grid,
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 24px;
      }
      .card {
        background: rgba(255, 253, 248, 0.92);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 18px;
        box-shadow: 0 14px 40px rgba(82, 69, 44, 0.08);
      }
      .label {
        display: block;
        margin-bottom: 8px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--muted);
        font-family: system-ui, sans-serif;
      }
      .value {
        font-size: 20px;
      }
      .layout {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 24px;
        margin-top: 28px;
      }
      .preview svg {
        width: 100%;
        height: auto;
        display: block;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
      }
      th, td {
        padding: 10px 0;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }
      th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
      .issues {
        margin-top: 24px;
        display: grid;
        gap: 12px;
      }
      .issue {
        border-left: 4px solid #b65f44;
        padding-left: 12px;
      }
      .issue strong {
        display: block;
        margin-bottom: 4px;
        text-transform: capitalize;
        font-family: system-ui, sans-serif;
      }
      .journal-meta {
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 12px;
        font-family: system-ui, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      footer {
        margin-top: 28px;
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
        <div>
          <p class="eyebrow">Printable Garden Sheet</p>
          <h1>${escapeHtml(plannerDocument.plan.name)}</h1>
          <p class="lede">${escapeHtml(
            plannerDocument.plan.notes ||
              plannerDocument.plan.locationLabel ||
              'Garden planning export from GardenGnome.',
          )}</p>
        </div>
        <div class="card">
          <span class="label">Prepared in GardenGnome</span>
          <div class="value">${escapeHtml(generatedAt)}</div>
        </div>
      </header>

      <section class="meta-grid">
        <article class="card"><span class="label">Location</span><div class="value">${escapeHtml(
          plannerDocument.plan.locationLabel || 'Unlabeled space',
        )}</div></article>
        <article class="card"><span class="label">Season</span><div class="value">${escapeHtml(
          plannerDocument.plan.seasonTag ?? 'Unscheduled',
        )}</div></article>
        <article class="card"><span class="label">Plan Size</span><div class="value">${escapeHtml(
          `${planWidth} × ${planHeight}`,
        )}</div></article>
        <article class="card"><span class="label">Grid</span><div class="value">${escapeHtml(
          `${plannerDocument.plan.widthCells} × ${plannerDocument.plan.heightCells} cells`,
        )}</div></article>
      </section>

      <section class="summary-grid">
        <article class="card"><span class="label">Zones</span><div class="value">${
          plannerDocument.zones.length
        }</div></article>
        <article class="card"><span class="label">Placements</span><div class="value">${
          plannerDocument.placements.length
        }</div></article>
        <article class="card"><span class="label">Placed Crops</span><div class="value">${
          cropRows ? plannerDocument.placements.map((placement) => placement.plantDefinitionId).filter((value, index, values) => values.indexOf(value) === index).length : 0
        }</div></article>
        <article class="card"><span class="label">Journal Notes</span><div class="value">${
          planJournalEntries.length
        }</div></article>
      </section>

      <section class="layout">
        <article class="card preview">
          <p class="eyebrow">Plan Preview</p>
          <h2>Static layout snapshot</h2>
          ${buildPlannerSvg(plannerDocument, plantDefinitions)}
        </article>

        <div>
          <article class="card">
            <p class="eyebrow">Zones</p>
            <h2>Footprint schedule</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Grid Origin</th>
                </tr>
              </thead>
              <tbody>
                ${zoneRows || '<tr><td colspan="4">No zones placed yet.</td></tr>'}
              </tbody>
            </table>
          </article>

          <article class="card" style="margin-top: 24px;">
            <p class="eyebrow">Crops</p>
            <h2>Placed crop list</h2>
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Zones</th>
                </tr>
              </thead>
              <tbody>
                ${cropRows || '<tr><td colspan="4">No crops placed yet.</td></tr>'}
              </tbody>
            </table>
          </article>
        </div>
      </section>

      ${
        journalMarkup
          ? `<section class="card issues">
              <p class="eyebrow">Journal</p>
              <h2>Field observations</h2>
              ${journalMarkup}
            </section>`
          : ''
      }

      ${
        seasonalTaskMarkup
          ? `<section class="card issues">
              <p class="eyebrow">Season tasks</p>
              <h2>Workbench checklist</h2>
              ${seasonalTaskMarkup}
            </section>`
          : ''
      }

      ${
        validationIssues.length > 0
          ? `<section class="card issues">
              <p class="eyebrow">Warnings</p>
              <h2>Advisory issues</h2>
              ${validationIssues
                .map(
                  (issue) => `
                    <article class="issue">
                      <strong>${escapeHtml(issue.code.replace(/-/g, ' '))}</strong>
                      <p>${escapeHtml(issue.message)}</p>
                    </article>
                  `,
                )
                .join('')}
            </section>`
          : ''
      }

      <footer>
        <span>Prepared in GardenGnome for printing or sharing.</span>
        <span>${escapeHtml(formatPrintableFilename(plannerDocument))}</span>
      </footer>
    </main>
  </body>
</html>`;
};

export const exportPrintablePlannerDocument = async (
  plannerDocument: PlannerDocument,
  plantDefinitions: PlantDefinition[] = [],
  validationIssues: ValidationIssue[] = [],
  journalEntries: GardenJournalEntry[] = [],
  seasonalTasks: SeasonalTask[] = [],
) => {
  const payload = serializePrintablePlannerDocument(
    plannerDocument,
    plantDefinitions,
    validationIssues,
    journalEntries,
    seasonalTasks,
  );

  if (isTauri()) {
    const target = await save({
      defaultPath: formatPrintableFilename(plannerDocument),
      filters: [{ name: 'GardenGnome Print Sheet', extensions: ['html'] }],
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
  anchor.download = formatPrintableFilename(plannerDocument);
  anchor.click();
  URL.revokeObjectURL(url);
};
