import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { useGardenStore } from '@/stores/gardenStore';

const initialState = useGardenStore.getState();

beforeEach(() => {
  act(() => {
    useGardenStore.setState({
      ...initialState,
      planSummaries: [
        {
          id: 'plan-1',
          name: 'Kitchen Garden 2026',
          locationLabel: 'Home',
          measurementSystem: 'imperial',
          widthCells: 20,
          heightCells: 12,
          cellSizeMm: 305,
          seasonTag: '2026',
          seasonFamilyId: 'family-1',
          sourcePlanId: null,
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
        {
          id: 'plan-2',
          name: 'Kitchen Garden Spring Layout',
          locationLabel: 'Home',
          measurementSystem: 'imperial',
          widthCells: 20,
          heightCells: 12,
          cellSizeMm: 305,
          seasonTag: '2027',
          seasonFamilyId: 'family-1',
          sourcePlanId: 'plan-1',
          updatedAt: '2027-04-12T00:00:00.000Z',
        },
        {
          id: 'plan-3',
          name: 'Patio Herbs 2026',
          locationLabel: 'Patio',
          measurementSystem: 'imperial',
          widthCells: 8,
          heightCells: 6,
          cellSizeMm: 305,
          seasonTag: '2026',
          seasonFamilyId: 'family-2',
          sourcePlanId: null,
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      duplicatePlanForNextSeason: vi.fn().mockResolvedValue('plan-4'),
      createPlan: vi.fn(),
      importPlanDocument: vi.fn(),
      duplicatePlan: vi.fn(),
      deletePlan: vi.fn(),
    });
  });
});

afterEach(() => {
  cleanup();

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('DashboardPage season shelf', () => {
  it('groups plans by season family and highlights the latest saved season', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /^Kitchen Garden$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 saved seasons/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest season: 2027/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Open Kitchen Garden 2026/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Open Kitchen Garden 2027/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Patio Herbs$/i })).toBeInTheDocument();
  });
});
