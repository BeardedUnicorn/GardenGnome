import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { useGardenStore } from '@/stores/gardenStore';

const initialState = useGardenStore.getState();

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  delete document.documentElement.dataset.theme;

  act(() => {
    useGardenStore.setState(initialState);
  });
});

describe('GardenGnome app flow', () => {
  it('applies the active theme to the document shell', async () => {
    act(() => {
      useGardenStore.setState({
        ...useGardenStore.getState(),
        status: 'ready',
        settings: {
          ...useGardenStore.getState().settings,
          theme: 'orchard-dusk',
        },
      });
    });

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('orchard-dusk');
    });
  });

  it(
    'creates a plan from the dashboard and navigates into the planner workspace',
    async () => {
      const user = userEvent.setup();

      render(<App />);

      expect(
        await screen.findByRole('heading', { name: /Garden Projects/i }),
      ).toBeInTheDocument();

      await user.type(screen.getByLabelText(/Garden name/i), 'Kitchen Garden');
      await user.clear(screen.getByLabelText(/Width \(cells\)/i));
      await user.type(screen.getByLabelText(/Width \(cells\)/i), '18');
      await user.clear(screen.getByLabelText(/Height \(cells\)/i));
      await user.type(screen.getByLabelText(/Height \(cells\)/i), '10');
      await user.click(screen.getByRole('button', { name: /Create garden/i }));

      await waitFor(
        () => {
          expect(window.location.pathname).toMatch(/^\/plans\/.+/);
        },
        { timeout: 5_000 },
      );

      expect(
        await screen.findByRole(
          'heading',
          { name: /Planner Workspace/i },
          { timeout: 5_000 },
        ),
      ).toBeInTheDocument();
      expect(
        await screen.findByDisplayValue('Kitchen Garden', undefined, {
          timeout: 5_000,
        }),
      ).toBeInTheDocument();
    },
    10_000,
  );

  it('navigates to the dedicated plant library screen from the app shell', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /Garden Projects/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Plants/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/plants');
    });

    expect(await screen.findByRole('heading', { name: /Plant catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add custom plant/i })).toBeInTheDocument();
  });
});
