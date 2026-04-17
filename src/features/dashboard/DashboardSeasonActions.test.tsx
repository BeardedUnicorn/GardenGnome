import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
          name: 'Kitchen Garden',
          locationLabel: 'Home',
          measurementSystem: 'imperial',
          widthCells: 20,
          heightCells: 12,
          cellSizeMm: 305,
          seasonTag: '2026',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
      ],
      duplicatePlanForNextSeason: vi.fn().mockResolvedValue('plan-2'),
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

describe('DashboardPage season actions', () => {
  it('duplicates a plan into the next season from the project shelf', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Next season/i }));

    expect(useGardenStore.getState().duplicatePlanForNextSeason).toHaveBeenCalledWith(
      'plan-1',
    );
  });
});
