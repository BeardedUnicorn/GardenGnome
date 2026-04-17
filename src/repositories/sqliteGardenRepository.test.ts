import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadMock } = vi.hoisted(() => ({
  loadMock: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: loadMock,
  },
}));

import type { GardenJournalEntry } from '@/domain/garden/models';
import type { PlantDefinition } from '@/domain/plants/models';
import { SqliteGardenRepository } from '@/repositories/sqliteGardenRepository';

const withCompatibility = (
  plant: PlantDefinition,
  compatibility: {
    companionPlantNames?: string[];
    conflictPlantNames?: string[];
    preferredZoneTypes?: string[];
  } = {},
) =>
  ({
    ...plant,
    companionPlantNames: [],
    conflictPlantNames: [],
    preferredZoneTypes: [],
    ...compatibility,
  }) as PlantDefinition;

const samplePlant: PlantDefinition = withCompatibility({
  id: 'plant-1',
  commonName: 'Basil',
  varietyName: 'Genovese',
  plantFamily: 'Lamiaceae',
  category: 'herb',
  lifecycle: 'annual',
  spacingMm: 203,
  spreadMm: 203,
  heightMm: 457,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 50,
  plantingWindowStartMonth: 5,
  plantingWindowEndMonth: 8,
  successionIntervalDays: 21,
  notes: '',
  isFavorite: false,
  isCustom: false,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  companionPlantNames: ['Tomato'],
  preferredZoneTypes: ['raisedBed', 'container'],
});

const secondPlant: PlantDefinition = withCompatibility({
  id: 'plant-2',
  commonName: 'Tomato',
  varietyName: 'Sun Gold',
  plantFamily: 'Solanaceae',
  category: 'fruiting',
  lifecycle: 'annual',
  spacingMm: 610,
  spreadMm: 610,
  heightMm: 1524,
  sunRequirement: 'fullSun',
  waterRequirement: 'moderate',
  daysToMaturity: 65,
  plantingWindowStartMonth: 4,
  plantingWindowEndMonth: 6,
  successionIntervalDays: null,
  notes: '',
  isFavorite: true,
  isCustom: true,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
}, {
  companionPlantNames: ['Basil', 'Marigold'],
  conflictPlantNames: ['Corn'],
  preferredZoneTypes: ['raisedBed', 'inGroundBed', 'trellis'],
});

const sampleJournalEntry: GardenJournalEntry = {
  id: 'journal-1',
  gardenPlanId: 'plan-1',
  title: 'First sprouts',
  body: 'Basil cotyledons opened after three days.',
  observedOn: '2026-04-15',
  createdAt: '2026-04-15T08:00:00.000Z',
  updatedAt: '2026-04-15T08:00:00.000Z',
};

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('SqliteGardenRepository', () => {
  beforeEach(() => {
    loadMock.mockReset();
  });

  it('enables SQLite foreign key enforcement when the connection is opened', async () => {
    const executeMock = vi.fn().mockResolvedValue(undefined);
    const selectMock = vi.fn().mockResolvedValue([]);

    loadMock.mockResolvedValue({
      execute: executeMock,
      select: selectMock,
    });

    const repository = new SqliteGardenRepository();

    await repository.listPlans();

    expect(loadMock).toHaveBeenCalledWith('sqlite:garden-gnome.db');
    expect(executeMock).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('upserts plant definitions and prunes removed rows without deleting the whole table first', async () => {
    const executeMock = vi.fn().mockResolvedValue(undefined);

    loadMock.mockResolvedValue({
      execute: executeMock,
    });

    const repository = new SqliteGardenRepository();

    await repository.savePlantDefinitions([samplePlant, secondPlant]);

    const sqlStatements = executeMock.mock.calls.map(([sql]) => normalizeSql(sql));

    expect(sqlStatements[0]).toBe('PRAGMA foreign_keys = ON');
    expect(sqlStatements[1]).toBe('BEGIN TRANSACTION');
    expect(sqlStatements.at(-1)).toBe('COMMIT');
    expect(
      sqlStatements.some((sql) => sql === 'DELETE FROM plant_definitions'),
    ).toBe(false);
    expect(
      sqlStatements.filter((sql) => sql.includes('INSERT INTO plant_definitions')),
    ).toHaveLength(2);
    expect(
      sqlStatements.some((sql) => sql.includes('ON CONFLICT(id) DO UPDATE')),
    ).toBe(true);
    expect(sqlStatements).toContain(
      'DELETE FROM plant_placements WHERE plant_definition_id NOT IN ($1, $2)',
    );
    expect(sqlStatements).toContain(
      'DELETE FROM plant_definitions WHERE id NOT IN ($1, $2)',
    );
    expect(
      executeMock.mock.calls.find(([sql]) =>
        normalizeSql(sql).startsWith('DELETE FROM plant_definitions WHERE id NOT IN'),
      )?.[1],
    ).toEqual(['plant-1', 'plant-2']);
    expect(
      executeMock.mock.calls.find(([sql]) =>
        normalizeSql(sql).startsWith('INSERT INTO plant_definitions'),
      )?.[1],
    ).toEqual(
      expect.arrayContaining([
        JSON.stringify(['Tomato']),
        JSON.stringify([]),
        JSON.stringify(['raisedBed', 'container']),
      ]),
    );
  });

  it('removes all persisted plant rows and placements when the library becomes empty', async () => {
    const executeMock = vi.fn().mockResolvedValue(undefined);

    loadMock.mockResolvedValue({
      execute: executeMock,
    });

    const repository = new SqliteGardenRepository();

    await repository.savePlantDefinitions([]);

    expect(executeMock.mock.calls.map(([sql]) => normalizeSql(sql))).toEqual([
      'PRAGMA foreign_keys = ON',
      'BEGIN TRANSACTION',
      'DELETE FROM plant_placements',
      'DELETE FROM plant_definitions',
      'COMMIT',
    ]);
  });

  it('lists persisted journal entries for a plan', async () => {
    const executeMock = vi.fn().mockResolvedValue(undefined);
    const selectMock = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'journal-1',
          garden_plan_id: 'plan-1',
          title: 'First sprouts',
          body: 'Basil cotyledons opened after three days.',
          observed_on: '2026-04-15',
          created_at: '2026-04-15T08:00:00.000Z',
          updated_at: '2026-04-15T08:00:00.000Z',
        },
      ]);

    loadMock.mockResolvedValue({
      execute: executeMock,
      select: selectMock,
    });

    const repository = new SqliteGardenRepository();

    await expect(repository.listJournalEntries('plan-1')).resolves.toEqual([
      sampleJournalEntry,
    ]);
    expect(selectMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM garden_journal_entries'),
      ['plan-1'],
    );
  });

  it('upserts and deletes journal entries', async () => {
    const executeMock = vi.fn().mockResolvedValue(undefined);

    loadMock.mockResolvedValue({
      execute: executeMock,
      select: vi.fn().mockResolvedValue([]),
    });

    const repository = new SqliteGardenRepository();

    await repository.saveJournalEntry(sampleJournalEntry);
    await repository.deleteJournalEntry('journal-1');

    const sqlStatements = executeMock.mock.calls.map(([sql]) => normalizeSql(sql));

    expect(sqlStatements).toContain(
      'INSERT OR REPLACE INTO garden_journal_entries ( id, garden_plan_id, title, body, observed_on, created_at, updated_at ) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    );
    expect(sqlStatements).toContain('DELETE FROM garden_journal_entries WHERE id = $1');
    expect(
      executeMock.mock.calls.find(([sql]) =>
        normalizeSql(sql).startsWith('INSERT OR REPLACE INTO garden_journal_entries'),
      )?.[1],
    ).toEqual([
      'journal-1',
      'plan-1',
      'First sprouts',
      'Basil cotyledons opened after three days.',
      '2026-04-15',
      '2026-04-15T08:00:00.000Z',
      '2026-04-15T08:00:00.000Z',
    ]);
  });
});
