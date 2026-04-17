import Database from '@tauri-apps/plugin-sql';

import type {
  AppSettings,
  GardenJournalEntry,
  GardenPlan,
  GardenPlanSummary,
  GardenZone,
  PlannerDocument,
  PlantPlacement,
  SeasonalTask,
} from '@/domain/garden/models';
import { sortSeasonalTasks } from '@/domain/garden/seasonalTasks';
import { normalizeSunProfile } from '@/domain/garden/sun';
import {
  normalizePlantReferenceNames,
  normalizePreferredZoneTypes,
} from '@/domain/plants/compatibility';
import type { PlantDefinition } from '@/domain/plants/models';
import type {
  DuplicatePlanOptions,
  GardenRepository,
} from '@/repositories/contracts';

type PlanRow = {
  id: string;
  name: string;
  location_label: string;
  notes: string;
  measurement_system: GardenPlan['measurementSystem'];
  width_cells: number;
  height_cells: number;
  cell_size_mm: number;
  season_tag: string | null;
  season_family_id: string | null;
  source_plan_id: string | null;
  sun_profile_json: string | null;
  created_at: string;
  updated_at: string;
};

type ZoneRow = {
  id: string;
  garden_plan_id: string;
  type: GardenZone['type'];
  shape: GardenZone['shape'];
  name: string;
  notes: string;
  grid_x: number;
  grid_y: number;
  width_cells: number;
  height_cells: number;
  rotation_degrees: GardenZone['rotationDegrees'];
  style_key: string;
  created_at: string;
  updated_at: string;
};

type PlacementRow = {
  id: string;
  garden_plan_id: string;
  plant_definition_id: string;
  zone_id: string | null;
  notes: string;
  grid_x: number;
  grid_y: number;
  footprint_width_cells: number;
  footprint_height_cells: number;
  quantity: number;
  layout_pattern: PlantPlacement['layoutPattern'];
  rotation_degrees: PlantPlacement['rotationDegrees'];
  created_at: string;
  updated_at: string;
};

type PlantRow = {
  id: string;
  common_name: string;
  variety_name: string;
  plant_family: string | null;
  category: PlantDefinition['category'];
  lifecycle: PlantDefinition['lifecycle'];
  spacing_mm: number;
  spread_mm: number;
  height_mm: number;
  sun_requirement: PlantDefinition['sunRequirement'];
  water_requirement: PlantDefinition['waterRequirement'];
  days_to_maturity: number;
  planting_window_start_month: number | null;
  planting_window_end_month: number | null;
  succession_interval_days: number | null;
  companion_plant_names_json: string | null;
  conflict_plant_names_json: string | null;
  preferred_zone_types_json: string | null;
  notes: string;
  is_favorite: number;
  is_custom: number;
  created_at: string;
  updated_at: string;
};

type SettingsRow = {
  id: string;
  measurement_system: AppSettings['measurementSystem'];
  default_cell_size_mm: number;
  theme: string;
  autosave_enabled: number;
  autosave_interval_seconds: number;
  show_grid: number;
  updated_at: string;
};

type JournalRow = {
  id: string;
  garden_plan_id: string;
  title: string;
  body: string;
  observed_on: string;
  created_at: string;
  updated_at: string;
};

type SeasonalTaskRow = {
  id: string;
  garden_plan_id: string;
  plant_definition_id: string | null;
  placement_id: string | null;
  source_key: string | null;
  kind: SeasonalTask['kind'];
  status: SeasonalTask['status'];
  due_month: number | null;
  title: string;
  note: string;
  created_at: string;
  updated_at: string;
};

const toBoolean = (value: number) => value === 1;
const toInteger = (value: boolean) => (value ? 1 : 0);
const parseSunProfile = (
  raw: string | null,
  widthCells: number,
  heightCells: number,
) => {
  if (!raw) {
    return normalizeSunProfile(undefined, widthCells, heightCells);
  }

  try {
    return normalizeSunProfile(
      JSON.parse(raw) as GardenPlan['sunProfile'],
      widthCells,
      heightCells,
    );
  } catch {
    return normalizeSunProfile(undefined, widthCells, heightCells);
  }
};
const serializeSunProfile = (plan: Pick<GardenPlan, 'widthCells' | 'heightCells' | 'sunProfile'>) =>
  JSON.stringify(normalizeSunProfile(plan.sunProfile, plan.widthCells, plan.heightCells));

const parseStringListJson = (raw: string | null) => {
  if (!raw) {
    return [];
  }

  try {
    return normalizePlantReferenceNames(JSON.parse(raw) as string[]);
  } catch {
    return [];
  }
};

const parsePreferredZoneTypesJson = (raw: string | null) => {
  if (!raw) {
    return [];
  }

  try {
    return normalizePreferredZoneTypes(JSON.parse(raw) as string[]);
  } catch {
    return [];
  }
};

const mapPlanRow = (row: PlanRow): GardenPlan => ({
  id: row.id,
  name: row.name,
  locationLabel: row.location_label,
  notes: row.notes,
  measurementSystem: row.measurement_system,
  widthCells: row.width_cells,
  heightCells: row.height_cells,
  cellSizeMm: row.cell_size_mm,
  seasonTag: row.season_tag,
  seasonFamilyId: row.season_family_id ?? row.id,
  sourcePlanId: row.source_plan_id ?? null,
  sunProfile: parseSunProfile(row.sun_profile_json, row.width_cells, row.height_cells),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapZoneRow = (row: ZoneRow): GardenZone => ({
  id: row.id,
  gardenPlanId: row.garden_plan_id,
  type: row.type,
  shape: row.shape,
  name: row.name,
  notes: row.notes,
  gridX: row.grid_x,
  gridY: row.grid_y,
  widthCells: row.width_cells,
  heightCells: row.height_cells,
  rotationDegrees: row.rotation_degrees,
  styleKey: row.style_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPlacementRow = (row: PlacementRow): PlantPlacement => ({
  id: row.id,
  gardenPlanId: row.garden_plan_id,
  plantDefinitionId: row.plant_definition_id,
  zoneId: row.zone_id,
  notes: row.notes,
  gridX: row.grid_x,
  gridY: row.grid_y,
  footprintWidthCells: row.footprint_width_cells,
  footprintHeightCells: row.footprint_height_cells,
  quantity: row.quantity,
  layoutPattern: row.layout_pattern,
  rotationDegrees: row.rotation_degrees,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPlantRow = (row: PlantRow): PlantDefinition => ({
  id: row.id,
  commonName: row.common_name,
  varietyName: row.variety_name,
  plantFamily: row.plant_family ?? null,
  category: row.category,
  lifecycle: row.lifecycle,
  spacingMm: row.spacing_mm,
  spreadMm: row.spread_mm,
  heightMm: row.height_mm,
  sunRequirement: row.sun_requirement,
  waterRequirement: row.water_requirement,
  daysToMaturity: row.days_to_maturity,
  plantingWindowStartMonth: row.planting_window_start_month ?? null,
  plantingWindowEndMonth: row.planting_window_end_month ?? null,
  successionIntervalDays: row.succession_interval_days ?? null,
  companionPlantNames: parseStringListJson(row.companion_plant_names_json),
  conflictPlantNames: parseStringListJson(row.conflict_plant_names_json),
  preferredZoneTypes: parsePreferredZoneTypesJson(row.preferred_zone_types_json),
  notes: row.notes,
  isFavorite: toBoolean(row.is_favorite),
  isCustom: toBoolean(row.is_custom),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapJournalRow = (row: JournalRow): GardenJournalEntry => ({
  id: row.id,
  gardenPlanId: row.garden_plan_id,
  title: row.title,
  body: row.body,
  observedOn: row.observed_on,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapSeasonalTaskRow = (row: SeasonalTaskRow): SeasonalTask => ({
  id: row.id,
  gardenPlanId: row.garden_plan_id,
  plantDefinitionId: row.plant_definition_id,
  placementId: row.placement_id,
  sourceKey: row.source_key,
  kind: row.kind,
  status: row.status,
  dueMonth: row.due_month,
  title: row.title,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type SqliteDatabase = Awaited<ReturnType<typeof Database.load>>;

const buildNumberedPlaceholders = (count: number) =>
  Array.from({ length: count }, (_, index) => `$${index + 1}`).join(', ');

const runInTransaction = async (
  database: SqliteDatabase,
  work: () => Promise<void>,
) => {
  await database.execute('BEGIN TRANSACTION');

  try {
    await work();
    await database.execute('COMMIT');
  } catch (error) {
    await database.execute('ROLLBACK');
    throw error;
  }
};

export class SqliteGardenRepository implements GardenRepository {
  #databasePromise: Promise<SqliteDatabase> | null = null;

  async #database() {
    if (!this.#databasePromise) {
      this.#databasePromise = Database.load('sqlite:garden-gnome.db').then(
        async (database) => {
          await database.execute('PRAGMA foreign_keys = ON');
          return database;
        },
      );
    }

    return this.#databasePromise;
  }

  async listPlans(): Promise<GardenPlanSummary[]> {
    const database = await this.#database();
    const rows = await database.select<PlanRow[]>(
      `
        SELECT
          id,
          name,
          location_label,
          measurement_system,
          width_cells,
          height_cells,
          cell_size_mm,
          season_tag,
          season_family_id,
          source_plan_id,
          sun_profile_json,
          updated_at
        FROM garden_plans
        ORDER BY updated_at DESC
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      locationLabel: row.location_label,
      measurementSystem: row.measurement_system,
      widthCells: row.width_cells,
      heightCells: row.height_cells,
      cellSizeMm: row.cell_size_mm,
      seasonTag: row.season_tag,
      seasonFamilyId: row.season_family_id ?? row.id,
      sourcePlanId: row.source_plan_id ?? null,
      updatedAt: row.updated_at,
    }));
  }

  async getPlanDocument(planId: string): Promise<PlannerDocument | null> {
    const database = await this.#database();
    const plans = await database.select<PlanRow[]>(
      `
        SELECT
          id,
          name,
          location_label,
          notes,
          measurement_system,
          width_cells,
          height_cells,
          cell_size_mm,
          season_tag,
          season_family_id,
          source_plan_id,
          sun_profile_json,
          created_at,
          updated_at
        FROM garden_plans
        WHERE id = $1
      `,
      [planId],
    );
    const plan = plans[0];

    if (!plan) {
      return null;
    }

    const [zones, placements] = await Promise.all([
      database.select<ZoneRow[]>(
        `
          SELECT
            id,
            garden_plan_id,
            type,
            shape,
            name,
            notes,
            grid_x,
            grid_y,
            width_cells,
            height_cells,
            rotation_degrees,
            style_key,
            created_at,
            updated_at
          FROM garden_zones
          WHERE garden_plan_id = $1
          ORDER BY created_at ASC
        `,
        [planId],
      ),
      database.select<PlacementRow[]>(
        `
          SELECT
            id,
            garden_plan_id,
            plant_definition_id,
            zone_id,
            notes,
            grid_x,
            grid_y,
            footprint_width_cells,
            footprint_height_cells,
            quantity,
            layout_pattern,
            rotation_degrees,
            created_at,
            updated_at
          FROM plant_placements
          WHERE garden_plan_id = $1
          ORDER BY created_at ASC
        `,
        [planId],
      ),
    ]);

    return {
      plan: mapPlanRow(plan),
      zones: zones.map(mapZoneRow),
      placements: placements.map(mapPlacementRow),
    };
  }

  async savePlanDocument(document: PlannerDocument): Promise<void> {
    const database = await this.#database();

    await database.execute(
      `
        INSERT OR REPLACE INTO garden_plans (
          id,
          name,
          location_label,
          notes,
          measurement_system,
          width_cells,
          height_cells,
          cell_size_mm,
          season_tag,
          season_family_id,
          source_plan_id,
          sun_profile_json,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        document.plan.id,
        document.plan.name,
        document.plan.locationLabel,
        document.plan.notes,
        document.plan.measurementSystem,
        document.plan.widthCells,
        document.plan.heightCells,
        document.plan.cellSizeMm,
        document.plan.seasonTag,
        document.plan.seasonFamilyId ?? document.plan.id,
        document.plan.sourcePlanId ?? null,
        serializeSunProfile(document.plan),
        document.plan.createdAt,
        document.plan.updatedAt,
      ],
    );

    await database.execute('DELETE FROM garden_zones WHERE garden_plan_id = $1', [
      document.plan.id,
    ]);
    await database.execute('DELETE FROM plant_placements WHERE garden_plan_id = $1', [
      document.plan.id,
    ]);

    for (const zone of document.zones) {
      await database.execute(
        `
          INSERT INTO garden_zones (
            id,
            garden_plan_id,
            type,
            shape,
            name,
            notes,
            grid_x,
            grid_y,
            width_cells,
            height_cells,
            rotation_degrees,
            style_key,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
        [
          zone.id,
          zone.gardenPlanId,
          zone.type,
          zone.shape,
          zone.name,
          zone.notes,
          zone.gridX,
          zone.gridY,
          zone.widthCells,
          zone.heightCells,
          zone.rotationDegrees,
          zone.styleKey,
          zone.createdAt,
          zone.updatedAt,
        ],
      );
    }

    for (const placement of document.placements) {
      await database.execute(
        `
          INSERT INTO plant_placements (
            id,
            garden_plan_id,
            plant_definition_id,
            zone_id,
            notes,
            grid_x,
            grid_y,
            footprint_width_cells,
            footprint_height_cells,
            quantity,
            layout_pattern,
            rotation_degrees,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
        [
          placement.id,
          placement.gardenPlanId,
          placement.plantDefinitionId,
          placement.zoneId,
          placement.notes,
          placement.gridX,
          placement.gridY,
          placement.footprintWidthCells,
          placement.footprintHeightCells,
          placement.quantity,
          placement.layoutPattern,
          placement.rotationDegrees,
          placement.createdAt,
          placement.updatedAt,
        ],
      );
    }
  }

  async duplicatePlan(
    planId: string,
    newPlanId: string,
    options?: DuplicatePlanOptions,
  ): Promise<PlannerDocument> {
    const current = await this.getPlanDocument(planId);

    if (!current) {
      throw new Error(`Unable to duplicate missing plan ${planId}.`);
    }

    const timestamp = new Date().toISOString();
    const duplicated: PlannerDocument = structuredClone(current);
    const zoneIdMap = new Map<string, string>();

    duplicated.plan.id = newPlanId;
    duplicated.plan.name = options?.name ?? `${duplicated.plan.name} Copy`;
    duplicated.plan.seasonTag =
      options?.seasonTag === undefined ? duplicated.plan.seasonTag : options.seasonTag;
    duplicated.plan.seasonFamilyId =
      duplicated.plan.seasonFamilyId ?? current.plan.seasonFamilyId ?? current.plan.id;
    duplicated.plan.sourcePlanId = planId;
    duplicated.plan.createdAt = timestamp;
    duplicated.plan.updatedAt = timestamp;
    duplicated.zones = duplicated.zones.map((zone, index) => ({
      ...zone,
      id: (() => {
        const duplicatedZoneId = `${newPlanId}:zone:${index}`;
        zoneIdMap.set(zone.id, duplicatedZoneId);
        return duplicatedZoneId;
      })(),
      gardenPlanId: newPlanId,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    duplicated.placements = duplicated.placements.map((placement, index) => ({
      ...placement,
      id: `${newPlanId}:placement:${index}`,
      gardenPlanId: newPlanId,
      zoneId: placement.zoneId ? zoneIdMap.get(placement.zoneId) ?? null : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await this.savePlanDocument(duplicated);
    return duplicated;
  }

  async deletePlan(planId: string): Promise<void> {
    const database = await this.#database();

    await database.execute('DELETE FROM garden_plans WHERE id = $1', [planId]);
  }

  async listPlantDefinitions(): Promise<PlantDefinition[]> {
    const database = await this.#database();
    const rows = await database.select<PlantRow[]>(
      `
        SELECT
          id,
          common_name,
          variety_name,
          plant_family,
          category,
          lifecycle,
          spacing_mm,
          spread_mm,
          height_mm,
          sun_requirement,
          water_requirement,
          days_to_maturity,
          planting_window_start_month,
          planting_window_end_month,
          succession_interval_days,
          companion_plant_names_json,
          conflict_plant_names_json,
          preferred_zone_types_json,
          notes,
          is_favorite,
          is_custom,
          created_at,
          updated_at
        FROM plant_definitions
        ORDER BY common_name ASC
      `,
    );

    return rows.map(mapPlantRow);
  }

  async listJournalEntries(planId: string): Promise<GardenJournalEntry[]> {
    const database = await this.#database();
    const rows = await database.select<JournalRow[]>(
      `
        SELECT
          id,
          garden_plan_id,
          title,
          body,
          observed_on,
          created_at,
          updated_at
        FROM garden_journal_entries
        WHERE garden_plan_id = $1
        ORDER BY observed_on DESC, created_at DESC
      `,
      [planId],
    );

    return rows.map(mapJournalRow);
  }

  async saveJournalEntry(entry: GardenJournalEntry): Promise<void> {
    const database = await this.#database();

    await database.execute(
      `
        INSERT OR REPLACE INTO garden_journal_entries (
          id,
          garden_plan_id,
          title,
          body,
          observed_on,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        entry.id,
        entry.gardenPlanId,
        entry.title,
        entry.body,
        entry.observedOn,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
  }

  async deleteJournalEntry(entryId: string): Promise<void> {
    const database = await this.#database();

    await database.execute('DELETE FROM garden_journal_entries WHERE id = $1', [
      entryId,
    ]);
  }

  async listSeasonalTasks(planId: string): Promise<SeasonalTask[]> {
    const database = await this.#database();
    const rows = await database.select<SeasonalTaskRow[]>(
      `
        SELECT
          id,
          garden_plan_id,
          plant_definition_id,
          placement_id,
          source_key,
          kind,
          status,
          due_month,
          title,
          note,
          created_at,
          updated_at
        FROM seasonal_tasks
        WHERE garden_plan_id = $1
      `,
      [planId],
    );

    return sortSeasonalTasks(rows.map(mapSeasonalTaskRow));
  }

  async saveSeasonalTask(task: SeasonalTask): Promise<void> {
    const database = await this.#database();

    await database.execute(
      `
        INSERT OR REPLACE INTO seasonal_tasks (
          id,
          garden_plan_id,
          plant_definition_id,
          placement_id,
          source_key,
          kind,
          status,
          due_month,
          title,
          note,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        task.id,
        task.gardenPlanId,
        task.plantDefinitionId,
        task.placementId,
        task.sourceKey,
        task.kind,
        task.status,
        task.dueMonth,
        task.title,
        task.note,
        task.createdAt,
        task.updatedAt,
      ],
    );
  }

  async deleteSeasonalTask(taskId: string): Promise<void> {
    const database = await this.#database();

    await database.execute('DELETE FROM seasonal_tasks WHERE id = $1', [taskId]);
  }

  async savePlantDefinitions(plants: PlantDefinition[]): Promise<void> {
    const database = await this.#database();
    const retainedPlantIds = plants.map((plant) => plant.id);

    await runInTransaction(database, async () => {
      for (const plant of plants) {
        await database.execute(
          `
            INSERT INTO plant_definitions (
              id,
              common_name,
              variety_name,
              plant_family,
              category,
              lifecycle,
              spacing_mm,
              spread_mm,
              height_mm,
              sun_requirement,
              water_requirement,
              days_to_maturity,
              planting_window_start_month,
              planting_window_end_month,
              succession_interval_days,
              companion_plant_names_json,
              conflict_plant_names_json,
              preferred_zone_types_json,
              notes,
              is_favorite,
              is_custom,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            ON CONFLICT(id) DO UPDATE SET
              common_name = excluded.common_name,
              variety_name = excluded.variety_name,
              plant_family = excluded.plant_family,
              category = excluded.category,
              lifecycle = excluded.lifecycle,
              spacing_mm = excluded.spacing_mm,
              spread_mm = excluded.spread_mm,
              height_mm = excluded.height_mm,
              sun_requirement = excluded.sun_requirement,
              water_requirement = excluded.water_requirement,
              days_to_maturity = excluded.days_to_maturity,
              planting_window_start_month = excluded.planting_window_start_month,
              planting_window_end_month = excluded.planting_window_end_month,
              succession_interval_days = excluded.succession_interval_days,
              companion_plant_names_json = excluded.companion_plant_names_json,
              conflict_plant_names_json = excluded.conflict_plant_names_json,
              preferred_zone_types_json = excluded.preferred_zone_types_json,
              notes = excluded.notes,
              is_favorite = excluded.is_favorite,
              is_custom = excluded.is_custom,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at
          `,
          [
            plant.id,
            plant.commonName,
            plant.varietyName,
            plant.plantFamily ?? null,
            plant.category,
            plant.lifecycle,
            plant.spacingMm,
            plant.spreadMm,
            plant.heightMm,
            plant.sunRequirement,
            plant.waterRequirement,
            plant.daysToMaturity,
            plant.plantingWindowStartMonth ?? null,
            plant.plantingWindowEndMonth ?? null,
            plant.successionIntervalDays ?? null,
            JSON.stringify(normalizePlantReferenceNames(plant.companionPlantNames)),
            JSON.stringify(normalizePlantReferenceNames(plant.conflictPlantNames)),
            JSON.stringify(normalizePreferredZoneTypes(plant.preferredZoneTypes)),
            plant.notes,
            toInteger(plant.isFavorite),
            toInteger(plant.isCustom),
            plant.createdAt,
            plant.updatedAt,
          ],
        );
      }

      if (retainedPlantIds.length === 0) {
        await database.execute('DELETE FROM plant_placements');
        await database.execute('DELETE FROM plant_definitions');
        return;
      }

      const placeholders = buildNumberedPlaceholders(retainedPlantIds.length);

      await database.execute(
        `DELETE FROM plant_placements WHERE plant_definition_id NOT IN (${placeholders})`,
        retainedPlantIds,
      );
      await database.execute(
        `DELETE FROM plant_definitions WHERE id NOT IN (${placeholders})`,
        retainedPlantIds,
      );
    });
  }

  async getSettings(): Promise<AppSettings | null> {
    const database = await this.#database();
    const rows = await database.select<SettingsRow[]>(
      `
        SELECT
          id,
          measurement_system,
          default_cell_size_mm,
          theme,
          autosave_enabled,
          autosave_interval_seconds,
          show_grid,
          updated_at
        FROM app_settings
        WHERE id = 'app'
      `,
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      measurementSystem: row.measurement_system,
      defaultCellSizeMm: row.default_cell_size_mm,
      theme: row.theme,
      autosaveEnabled: toBoolean(row.autosave_enabled),
      autosaveIntervalSeconds: row.autosave_interval_seconds,
      showGrid: toBoolean(row.show_grid),
      updatedAt: row.updated_at,
    };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const database = await this.#database();

    await database.execute(
      `
        INSERT OR REPLACE INTO app_settings (
          id,
          measurement_system,
          default_cell_size_mm,
          theme,
          autosave_enabled,
          autosave_interval_seconds,
          show_grid,
          updated_at
        ) VALUES ('app', $1, $2, $3, $4, $5, $6, $7)
      `,
      [
        settings.measurementSystem,
        settings.defaultCellSizeMm,
        settings.theme,
        toInteger(settings.autosaveEnabled),
        settings.autosaveIntervalSeconds,
        toInteger(settings.showGrid),
        settings.updatedAt,
      ],
    );
  }
}
