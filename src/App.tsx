import { useEffect } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { PlantLibraryPage } from '@/features/plants/PlantLibraryPage';
import { PlannerPage } from '@/features/planner/PlannerPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useGardenStore } from '@/stores/gardenStore';

const Shell = () => (
  <div className="app-shell">
    <header className="app-header">
      <div>
        <p className="eyebrow">GardenGnome</p>
        <h1>Calm planning for ambitious backyard gardens.</h1>
      </div>
      <nav className="app-nav" aria-label="Primary navigation">
        <NavLink
          className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill--active' : ''}`}
          to="/"
        >
          Projects
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill--active' : ''}`}
          to="/settings"
        >
          Settings
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill--active' : ''}`}
          to="/plants"
        >
          Plants
        </NavLink>
      </nav>
    </header>

    <main className="app-main">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/plans/:planId" element={<PlannerPage />} />
        <Route path="/plants" element={<PlantLibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  </div>
);

export default function App() {
  const status = useGardenStore((state) => state.status);
  const errorMessage = useGardenStore((state) => state.errorMessage);
  const theme = useGardenStore((state) => state.settings.theme);
  const initialize = useGardenStore((state) => state.initialize);

  useEffect(() => {
    if (status === 'idle') {
      void initialize();
    }
  }, [initialize, status]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme || 'garden-day';

    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  return (
    <BrowserRouter>
      {status === 'loading' || status === 'idle' ? (
        <div className="loading-screen">
          <div className="loading-card">
            <p className="eyebrow">Preparing your garden desk</p>
            <h2>Loading GardenGnome</h2>
            <p>
              Opening the plant library, local storage, and planner workspace.
            </p>
          </div>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="loading-screen">
          <div className="loading-card loading-card--error">
            <p className="eyebrow">Startup error</p>
            <h2>GardenGnome could not start</h2>
            <p>{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {status === 'ready' ? <Shell /> : null}
    </BrowserRouter>
  );
}
