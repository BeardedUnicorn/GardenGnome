#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations(sqlite_database_url(), sqlite_migrations())
        .build(),
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn sqlite_database_url() -> &'static str {
  "sqlite:garden-gnome.db"
}

fn sqlite_migrations() -> Vec<tauri_plugin_sql::Migration> {
  vec![
    tauri_plugin_sql::Migration {
      version: 1,
      description: "create_initial_schema",
      sql: r#"
        CREATE TABLE IF NOT EXISTS garden_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location_label TEXT,
          notes TEXT NOT NULL DEFAULT '',
          measurement_system TEXT NOT NULL,
          width_cells INTEGER NOT NULL,
          height_cells INTEGER NOT NULL,
          cell_size_mm INTEGER NOT NULL,
          season_tag TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS garden_zones (
          id TEXT PRIMARY KEY,
          garden_plan_id TEXT NOT NULL,
          type TEXT NOT NULL,
          shape TEXT NOT NULL,
          name TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          grid_x INTEGER NOT NULL,
          grid_y INTEGER NOT NULL,
          width_cells INTEGER NOT NULL,
          height_cells INTEGER NOT NULL,
          rotation_degrees INTEGER NOT NULL DEFAULT 0,
          style_key TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (garden_plan_id) REFERENCES garden_plans(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS plant_definitions (
          id TEXT PRIMARY KEY,
          common_name TEXT NOT NULL,
          variety_name TEXT,
          category TEXT NOT NULL,
          lifecycle TEXT NOT NULL,
          spacing_mm INTEGER NOT NULL,
          spread_mm INTEGER NOT NULL,
          height_mm INTEGER NOT NULL,
          sun_requirement TEXT NOT NULL,
          water_requirement TEXT NOT NULL,
          days_to_maturity INTEGER NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          is_favorite INTEGER NOT NULL DEFAULT 0,
          is_custom INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS plant_placements (
          id TEXT PRIMARY KEY,
          garden_plan_id TEXT NOT NULL,
          plant_definition_id TEXT NOT NULL,
          zone_id TEXT,
          notes TEXT NOT NULL DEFAULT '',
          grid_x INTEGER NOT NULL,
          grid_y INTEGER NOT NULL,
          footprint_width_cells INTEGER NOT NULL,
          footprint_height_cells INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          layout_pattern TEXT NOT NULL,
          rotation_degrees INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (garden_plan_id) REFERENCES garden_plans(id) ON DELETE CASCADE,
          FOREIGN KEY (plant_definition_id) REFERENCES plant_definitions(id) ON DELETE CASCADE,
          FOREIGN KEY (zone_id) REFERENCES garden_zones(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          id TEXT PRIMARY KEY,
          measurement_system TEXT NOT NULL,
          default_cell_size_mm INTEGER NOT NULL,
          theme TEXT NOT NULL,
          autosave_enabled INTEGER NOT NULL,
          autosave_interval_seconds INTEGER NOT NULL,
          show_grid INTEGER NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (1, 'create_initial_schema');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 2,
      description: "add_plant_seasonality_columns",
      sql: r#"
        ALTER TABLE plant_definitions
        ADD COLUMN planting_window_start_month INTEGER;

        ALTER TABLE plant_definitions
        ADD COLUMN planting_window_end_month INTEGER;

        ALTER TABLE plant_definitions
        ADD COLUMN succession_interval_days INTEGER;

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (2, 'add_plant_seasonality_columns');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 3,
      description: "add_plan_lineage_columns",
      sql: r#"
        ALTER TABLE garden_plans
        ADD COLUMN season_family_id TEXT;

        ALTER TABLE garden_plans
        ADD COLUMN source_plan_id TEXT;

        UPDATE garden_plans
        SET season_family_id = id
        WHERE season_family_id IS NULL;

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (3, 'add_plan_lineage_columns');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 4,
      description: "add_plan_sun_profile",
      sql: r#"
        ALTER TABLE garden_plans
        ADD COLUMN sun_profile_json TEXT;

        UPDATE garden_plans
        SET sun_profile_json = '{"shadeEdge":"north","shadeDepthCells":2,"partShadeDepthCells":4}'
        WHERE sun_profile_json IS NULL OR TRIM(sun_profile_json) = '';

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (4, 'add_plan_sun_profile');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 5,
      description: "add_plant_family",
      sql: r#"
        ALTER TABLE plant_definitions
        ADD COLUMN plant_family TEXT;

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (5, 'add_plant_family');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 6,
      description: "add_garden_journal_entries",
      sql: r#"
        CREATE TABLE IF NOT EXISTS garden_journal_entries (
          id TEXT PRIMARY KEY,
          garden_plan_id TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          observed_on TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (garden_plan_id) REFERENCES garden_plans(id) ON DELETE CASCADE
        );

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (6, 'add_garden_journal_entries');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 7,
      description: "add_plant_compatibility_metadata",
      sql: r#"
        ALTER TABLE plant_definitions
        ADD COLUMN companion_plant_names_json TEXT;

        ALTER TABLE plant_definitions
        ADD COLUMN conflict_plant_names_json TEXT;

        ALTER TABLE plant_definitions
        ADD COLUMN preferred_zone_types_json TEXT;

        UPDATE plant_definitions
        SET
          companion_plant_names_json = COALESCE(companion_plant_names_json, '[]'),
          conflict_plant_names_json = COALESCE(conflict_plant_names_json, '[]'),
          preferred_zone_types_json = COALESCE(preferred_zone_types_json, '[]');

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (7, 'add_plant_compatibility_metadata');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
      version: 8,
      description: "add_seasonal_tasks",
      sql: r#"
        CREATE TABLE IF NOT EXISTS seasonal_tasks (
          id TEXT PRIMARY KEY,
          garden_plan_id TEXT NOT NULL,
          plant_definition_id TEXT,
          placement_id TEXT,
          source_key TEXT,
          kind TEXT NOT NULL,
          status TEXT NOT NULL,
          due_month INTEGER,
          title TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (garden_plan_id) REFERENCES garden_plans(id) ON DELETE CASCADE,
          FOREIGN KEY (plant_definition_id) REFERENCES plant_definitions(id) ON DELETE CASCADE,
          FOREIGN KEY (placement_id) REFERENCES plant_placements(id) ON DELETE SET NULL
        );

        INSERT OR IGNORE INTO schema_migrations (version, description)
        VALUES (8, 'add_seasonal_tasks');
      "#,
      kind: tauri_plugin_sql::MigrationKind::Up,
    },
  ]
}

#[cfg(test)]
mod tests {
  use super::{sqlite_database_url, sqlite_migrations};
  use rusqlite::{params, Connection};

  #[test]
  fn sqlite_database_url_uses_relative_app_path() {
    assert_eq!(sqlite_database_url(), "sqlite:garden-gnome.db");
  }

  #[test]
  fn sqlite_migrations_are_sorted_and_unique() {
    let migrations = sqlite_migrations();
    let versions: Vec<i64> = migrations.iter().map(|migration| migration.version).collect();

    assert_eq!(versions, vec![1, 2, 3, 4, 5, 6, 7, 8]);
  }

  #[test]
  fn sqlite_migrations_cover_current_plan_and_plant_schema() {
    let migrations = sqlite_migrations();
    let combined_sql = migrations
      .iter()
      .map(|migration| migration.sql)
      .collect::<Vec<_>>()
      .join("\n");

    assert!(combined_sql.contains("season_family_id TEXT"));
    assert!(combined_sql.contains("source_plan_id TEXT"));
    assert!(combined_sql.contains("sun_profile_json TEXT"));
    assert!(combined_sql.contains("plant_family TEXT"));
    assert!(combined_sql.contains("succession_interval_days INTEGER"));
    assert!(combined_sql.contains("companion_plant_names_json TEXT"));
    assert!(combined_sql.contains("conflict_plant_names_json TEXT"));
    assert!(combined_sql.contains("preferred_zone_types_json TEXT"));
    assert!(combined_sql.contains("garden_journal_entries"));
    assert!(combined_sql.contains("observed_on TEXT NOT NULL"));
    assert!(combined_sql.contains("seasonal_tasks"));
    assert!(combined_sql.contains("source_key TEXT"));
  }

  #[test]
  fn sqlite_migrations_apply_cleanly_to_a_fresh_database() {
    let connection = Connection::open_in_memory().expect("open sqlite memory database");

    for migration in sqlite_migrations() {
      connection
        .execute_batch(migration.sql)
        .unwrap_or_else(|error| panic!("migration {} failed: {error}", migration.version));
    }

    let mut plan_columns = connection
      .prepare("PRAGMA table_info(garden_plans)")
      .expect("prepare garden_plans info");
    let plan_column_names = plan_columns
      .query_map([], |row| row.get::<_, String>(1))
      .expect("query garden_plans info")
      .collect::<Result<Vec<_>, _>>()
      .expect("collect garden_plans columns");

    assert!(plan_column_names.iter().any(|name| name == "season_family_id"));
    assert!(plan_column_names.iter().any(|name| name == "source_plan_id"));
    assert!(plan_column_names.iter().any(|name| name == "sun_profile_json"));

    let mut plant_columns = connection
      .prepare("PRAGMA table_info(plant_definitions)")
      .expect("prepare plant_definitions info");
    let plant_column_names = plant_columns
      .query_map([], |row| row.get::<_, String>(1))
      .expect("query plant_definitions info")
      .collect::<Result<Vec<_>, _>>()
      .expect("collect plant_definitions columns");

    assert!(plant_column_names.iter().any(|name| name == "plant_family"));
    assert!(plant_column_names.iter().any(|name| name == "succession_interval_days"));
    assert!(plant_column_names
      .iter()
      .any(|name| name == "companion_plant_names_json"));
    assert!(plant_column_names
      .iter()
      .any(|name| name == "conflict_plant_names_json"));
    assert!(plant_column_names
      .iter()
      .any(|name| name == "preferred_zone_types_json"));

    let mut placement_foreign_keys = connection
      .prepare("PRAGMA foreign_key_list(plant_placements)")
      .expect("prepare plant_placements foreign keys");
    let foreign_key_tables = placement_foreign_keys
      .query_map([], |row| row.get::<_, String>(2))
      .expect("query plant_placements foreign keys")
      .collect::<Result<Vec<_>, _>>()
      .expect("collect plant_placements foreign keys");

    assert!(foreign_key_tables.iter().any(|table| table == "garden_plans"));
    assert!(foreign_key_tables.iter().any(|table| table == "plant_definitions"));
    assert!(foreign_key_tables.iter().any(|table| table == "garden_zones"));

    let mut journal_foreign_keys = connection
      .prepare("PRAGMA foreign_key_list(garden_journal_entries)")
      .expect("prepare garden_journal_entries foreign keys");
    let journal_foreign_key_tables = journal_foreign_keys
      .query_map([], |row| row.get::<_, String>(2))
      .expect("query garden_journal_entries foreign keys")
      .collect::<Result<Vec<_>, _>>()
      .expect("collect garden_journal_entries foreign keys");

    assert!(journal_foreign_key_tables.iter().any(|table| table == "garden_plans"));

    let mut seasonal_task_columns = connection
      .prepare("PRAGMA table_info(seasonal_tasks)")
      .expect("prepare seasonal_tasks info");
    let seasonal_task_column_names = seasonal_task_columns
      .query_map([], |row| row.get::<_, String>(1))
      .expect("query seasonal_tasks info")
      .collect::<Result<Vec<_>, _>>()
      .expect("collect seasonal_tasks columns");

    assert!(seasonal_task_column_names.iter().any(|name| name == "source_key"));
    assert!(seasonal_task_column_names.iter().any(|name| name == "due_month"));

    let mut seasonal_task_foreign_keys = connection
      .prepare("PRAGMA foreign_key_list(seasonal_tasks)")
      .expect("prepare seasonal_tasks foreign keys");
    let seasonal_task_foreign_key_tables = seasonal_task_foreign_keys
      .query_map([], |row| row.get::<_, String>(2))
      .expect("query seasonal_tasks foreign keys")
      .collect::<Result<Vec<_>, _>>()
      .expect("collect seasonal_tasks foreign keys");

    assert!(seasonal_task_foreign_key_tables
      .iter()
      .any(|table| table == "garden_plans"));
    assert!(seasonal_task_foreign_key_tables
      .iter()
      .any(|table| table == "plant_definitions"));
    assert!(seasonal_task_foreign_key_tables
      .iter()
      .any(|table| table == "plant_placements"));
  }

  #[test]
  fn sqlite_schema_enforces_foreign_key_cascades_when_enabled() {
    let connection = Connection::open_in_memory().expect("open sqlite memory database");

    for migration in sqlite_migrations() {
      connection
        .execute_batch(migration.sql)
        .unwrap_or_else(|error| panic!("migration {} failed: {error}", migration.version));
    }

    connection
      .execute_batch("PRAGMA foreign_keys = ON;")
      .expect("enable foreign keys");

    connection
      .execute(
        "INSERT INTO garden_plans (
          id, name, location_label, notes, measurement_system, width_cells, height_cells,
          cell_size_mm, season_tag, season_family_id, source_plan_id, sun_profile_json,
          created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
          "plan-1",
          "Kitchen Garden",
          "Home",
          "",
          "imperial",
          12,
          10,
          305,
          "2026",
          "plan-1",
          Option::<&str>::None,
          r#"{"shadeEdge":"north","shadeDepthCells":2,"partShadeDepthCells":4}"#,
          "2026-04-12T00:00:00.000Z",
          "2026-04-12T00:00:00.000Z",
        ],
      )
      .expect("insert plan");
    connection
      .execute(
        "INSERT INTO plant_definitions (
          id, common_name, variety_name, plant_family, category, lifecycle, spacing_mm,
          spread_mm, height_mm, sun_requirement, water_requirement, days_to_maturity,
          planting_window_start_month, planting_window_end_month, succession_interval_days,
          companion_plant_names_json, conflict_plant_names_json, preferred_zone_types_json,
          notes, is_favorite, is_custom, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
        params![
          "plant-1",
          "Basil",
          "Genovese",
          "Lamiaceae",
          "herb",
          "annual",
          203,
          203,
          457,
          "fullSun",
          "moderate",
          50,
          5,
          8,
          21,
          r#"["Tomato"]"#,
          r#"[]"#,
          r#"["raisedBed","container"]"#,
          "",
          0,
          0,
          "2026-04-12T00:00:00.000Z",
          "2026-04-12T00:00:00.000Z",
        ],
      )
      .expect("insert plant");
    connection
      .execute(
        "INSERT INTO plant_placements (
          id, garden_plan_id, plant_definition_id, zone_id, notes, grid_x, grid_y,
          footprint_width_cells, footprint_height_cells, quantity, layout_pattern,
          rotation_degrees, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
          "placement-1",
          "plan-1",
          "plant-1",
          Option::<&str>::None,
          "",
          1,
          1,
          1,
          1,
          1,
          "single",
          0,
          "2026-04-12T00:00:00.000Z",
          "2026-04-12T00:00:00.000Z",
        ],
      )
      .expect("insert placement");
    connection
      .execute(
        "INSERT INTO garden_journal_entries (
          id, garden_plan_id, title, body, observed_on, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
          "journal-1",
          "plan-1",
          "First sprouts",
          "Basil cotyledons opened after three days.",
          "2026-04-15",
          "2026-04-15T08:00:00.000Z",
          "2026-04-15T08:00:00.000Z",
        ],
      )
      .expect("insert journal entry");
    connection
      .execute(
        "INSERT INTO seasonal_tasks (
          id, garden_plan_id, plant_definition_id, placement_id, source_key, kind, status,
          due_month, title, note, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
          "seasonal-task-1",
          "plan-1",
          "plant-1",
          "placement-1",
          "plant-1-window-open",
          "plant",
          "pending",
          5,
          "Plant Basil now",
          "Basil is in its May planting window.",
          "2026-04-15T08:00:00.000Z",
          "2026-04-15T08:00:00.000Z",
        ],
      )
      .expect("insert seasonal task");

    connection
      .execute("DELETE FROM plant_definitions WHERE id = ?1", ["plant-1"])
      .expect("delete plant");

    let placement_count: i64 = connection
      .query_row("SELECT COUNT(*) FROM plant_placements", [], |row| row.get(0))
      .expect("count placements");
    let journal_count: i64 = connection
      .query_row("SELECT COUNT(*) FROM garden_journal_entries", [], |row| row.get(0))
      .expect("count journal entries");
    let seasonal_task_count: i64 = connection
      .query_row("SELECT COUNT(*) FROM seasonal_tasks", [], |row| row.get(0))
      .expect("count seasonal tasks");

    assert_eq!(placement_count, 0);
    assert_eq!(journal_count, 1);
    assert_eq!(seasonal_task_count, 0);

    connection
      .execute("DELETE FROM garden_plans WHERE id = ?1", ["plan-1"])
      .expect("delete plan");

    let journal_count_after_plan_delete: i64 = connection
      .query_row("SELECT COUNT(*) FROM garden_journal_entries", [], |row| row.get(0))
      .expect("count journal entries after plan delete");

    assert_eq!(journal_count_after_plan_delete, 0);
  }
}
