import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { useGardenStore } from '@/stores/gardenStore';

const importPlannerDocumentMock = vi.fn();

vi.mock('@/services/planTransport', () => ({
  importPlannerDocument: () => importPlannerDocumentMock(),
}));

const initialState = useGardenStore.getState();

beforeEach(() => {
  importPlannerDocumentMock.mockReset();

  act(() => {
    useGardenStore.setState({
      ...initialState,
      planSummaries: [],
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

describe('DashboardPage imports', () => {
  it('shows a validation error when importing an invalid plan file', async () => {
    const user = userEvent.setup();
    importPlannerDocumentMock.mockRejectedValueOnce(
      new Error('The selected file is not a valid GardenGnome plan document.'),
    );

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Import JSON/i }));

    expect(
      await screen.findByText(/not a valid GardenGnome plan document/i),
    ).toBeInTheDocument();
    expect(useGardenStore.getState().importPlanDocument).not.toHaveBeenCalled();
  });

  it('creates a metric plan using millimeter cell sizing when selected', async () => {
    const user = userEvent.setup();
    const createPlan = vi.fn().mockResolvedValue('plan-metric');

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        settings: {
          ...useGardenStore.getState().settings,
          measurementSystem: 'metric',
          defaultCellSizeMm: 300,
        },
        createPlan,
      });
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Measurement system/i)).toHaveValue('metric');
    expect(screen.getByLabelText(/Cell size \(mm\)/i)).toHaveValue(300);

    await user.type(screen.getByLabelText(/Garden name/i), 'Metric Garden');
    await user.selectOptions(screen.getByLabelText(/Measurement system/i), 'metric');
    await user.clear(screen.getByLabelText(/Cell size \(mm\)/i));
    await user.type(screen.getByLabelText(/Cell size \(mm\)/i), '450');
    await user.click(screen.getByRole('button', { name: /Create garden/i }));

    expect(createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Metric Garden',
        measurementSystem: 'metric',
        cellSizeMm: 450,
      }),
    );
  });

  it('creates a starter garden from a built-in template', async () => {
    const user = userEvent.setup();
    const createPlan = vi.fn().mockResolvedValue('plan-template');

    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        createPlan,
      });
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Use Raised Bed Starter/i }));

    expect(createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'raised-bed-starter',
      }),
    );
  });
});
