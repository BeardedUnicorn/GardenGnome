# GardenGnome

GardenGnome is a local-first garden planning app for backyard plots, raised beds, and container layouts. The project ships as a React + Vite app and can also run as a Tauri desktop application with SQLite-backed persistence.

## What It Does

- Create garden projects with custom dimensions, measurement systems, and season tags.
- Build plans visually with zones, plant placements, and validation feedback.
- Track season-to-season changes with duplication and rotation-aware workflows.
- Maintain a plant catalog with seeded data and custom crops.
- Capture journal entries and seasonal tasks alongside each plan.
- Export single-plan JSON files, printable planner sheets, season packets, and full workspace backups.

## Stack

- React 19 + TypeScript
- Vite for the web app build and dev server
- Tauri 2 for the desktop shell
- Zustand for client state
- Zod for schema validation and import/export safety
- Vitest and Testing Library for unit and component tests
- Playwright for end-to-end coverage

## Running Locally

### Prerequisites

- A recent Node.js LTS release with `npm`
- Rust toolchain and the platform dependencies required by Tauri if you want to run the desktop app

### Install

```bash
npm install
```

### Start The Web App

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`.

### Start The Desktop App

```bash
npm run tauri dev
```

This launches the Tauri shell and connects it to the Vite frontend.

## Common Commands

```bash
npm run build       # Type-check and build the web app
npm run lint        # Run ESLint
npm test            # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
npm run test:e2e    # Run Playwright tests
```

## Project Areas

### Dashboard

The dashboard is the entry point for creating new projects, starting from templates, importing plan documents, and duplicating plans into a new season.

### Planner Workspace

The planner workspace is the main editing surface. It includes the canvas, inspector, journal panel, season panel, seasonal workbench, validation warnings, zoom controls, undo/redo, autosave, and export actions.

### Plant Catalog

The plant library lets you review the seeded catalog and maintain custom crop metadata used by placements and planning guidance.

### Settings

Settings manage measurement defaults, planner theme, autosave behavior, grid visibility, and full workspace import/export.

## Data And Persistence

- In the browser, GardenGnome stores data in `localStorage`.
- In the Tauri desktop app, GardenGnome uses the Tauri SQL plugin with a local SQLite database.
- Plan exports and workspace backups are JSON files validated with Zod on import.
- The app is designed around local persistence rather than a hosted backend.

## Repository Layout

```text
src/          React app, domain logic, repositories, stores, and services
src-tauri/    Tauri desktop shell, Rust code, capabilities, and build config
playwright/   End-to-end tests
public/       Static assets
```

## Notes

- The repository factory switches between browser storage and SQLite depending on whether the app is running inside Tauri.
- Generated desktop build artifacts live under `src-tauri/target`.
- Generated schema artifacts may appear under `src-tauri/gen`.

## License

MIT
