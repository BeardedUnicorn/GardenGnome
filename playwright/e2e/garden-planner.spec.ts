import { expect, test } from '@playwright/test';
import { promises as fs } from 'node:fs';

const resetWorkspace = async (page: Parameters<typeof test>[0]['page']) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Garden Projects' })).toBeVisible();
};

const createGarden = async (page: Parameters<typeof test>[0]['page'], name: string) => {
  await resetWorkspace(page);

  await page.getByLabel('Garden name').fill(name);
  await page.getByLabel('Location').fill('South Fence');
  await page.getByLabel('Width (cells)').fill('18');
  await page.getByLabel('Height (cells)').fill('12');
  await page.getByLabel('Season tag').fill('2026');
  await page.getByRole('button', { name: 'Create garden' }).click();

  await expect(page).toHaveURL(/\/plans\/.+/);
  await expect(page.getByRole('heading', { name: 'Planner Workspace' })).toBeVisible();
};

test.describe('planner e2e', () => {
  test('creates a plan, places a crop, and reloads persisted data', async ({ page }) => {
    await createGarden(page, 'Reload Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await page.getByRole('tab', { name: 'plants' }).click();

    const basilCard = page.locator('.plant-card').filter({ hasText: 'Basil' }).first();
    await basilCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await expect(page.locator('.planner-canvas')).toContainText('Raised bed');
    await expect(page.locator('.planner-canvas')).toContainText('Basil');

    await page.getByRole('button', { name: 'Save now' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Planner Workspace' })).toBeVisible();
    await expect(page.locator('.planner-canvas')).toContainText('Raised bed');
    await expect(page.locator('.planner-canvas')).toContainText('Basil');
  });

  test('fills a growable zone with a crop layout helper', async ({ page }) => {
    await createGarden(page, 'Fill Layout Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await page.getByRole('tab', { name: 'plants' }).click();
    await page.getByRole('button', { name: 'fill' }).click();

    const basilCard = page.locator('.plant-card').filter({ hasText: 'Basil' }).first();
    await basilCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await expect(
      page.locator('.planner-canvas text').filter({ hasText: 'Basil' }),
    ).toHaveCount(8);
  });

  test('suggests in-window companion crops for full-sun layouts', async ({ page }) => {
    await createGarden(page, 'Companion Guidance Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 240 } });

    await page.getByRole('tab', { name: 'plants' }).click();
    const tomatoCard = page.locator('.plant-card').filter({ hasText: 'Tomato' }).first();
    await tomatoCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 96, y: 240 } });

    await expect(page.getByRole('heading', { name: 'Companion guidance' })).toBeVisible();
    await expect(page.getByText('Add Marigold near Tomato')).toBeVisible();
    await expect(page.getByText('Add Basil near Tomato')).toHaveCount(0);
  });

  test('warns when one bed mixes crops with different water needs', async ({ page }) => {
    await createGarden(page, 'Water Warning Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await page.getByRole('tab', { name: 'plants' }).click();

    const tomatoCard = page.locator('.plant-card').filter({ hasText: 'Tomato' }).first();
    await tomatoCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    const thymeCard = page.locator('.plant-card').filter({ hasText: 'Thyme' }).first();
    await thymeCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 222, y: 96 } });

    await expect(
      page.locator('.issue-card strong').filter({ hasText: /irrigation balance/i }),
    ).toBeVisible();
    await expect(page.getByText(/split into separate watering runs/i)).toBeVisible();
  });

  test('surfaces overlap warnings and supports undo/redo', async ({ page }) => {
    await createGarden(page, 'Warning Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });
    await canvas.click({ position: { x: 50, y: 96 } });

    const overlapWarning = page.getByText(/zone overlap/i);

    await expect(overlapWarning).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(overlapWarning).toBeHidden();

    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(overlapWarning).toBeVisible();

    await page.getByRole('button', { name: 'Save now' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();

    await page.reload();

    await expect(page.getByText(/zone overlap/i)).toBeVisible();
  });

  test('exports a plan and imports it back into the dashboard', async ({ page }) => {
    await createGarden(page, 'Import Export Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await page.getByRole('tab', { name: 'plants' }).click();
    const basilCard = page.locator('.plant-card').filter({ hasText: 'Basil' }).first();
    await basilCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(downloadPath).not.toBeNull();

    const payload = await fs.readFile(downloadPath!, 'utf8');

    await page.getByRole('link', { name: 'Back to shelf' }).click();
    await expect(page.getByRole('heading', { name: 'Existing Gardens' })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'import-export-garden.json',
      mimeType: 'application/json',
      buffer: Buffer.from(payload),
    });

    await expect(page).toHaveURL(/\/plans\/.+/);
    await expect(page.getByLabel('Plan name')).toHaveValue('Import Export Garden Imported');
    await expect(page.locator('.planner-canvas')).toContainText('Raised bed');
    await expect(page.locator('.planner-canvas')).toContainText('Basil');
  });

  test('downloads a printable planner sheet with plan details and placed crops', async ({ page }) => {
    await createGarden(page, 'Printable Garden');

    const canvas = page.locator('.planner-stage');

    await page.getByRole('button', { name: 'Raised bed' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await page.getByRole('tab', { name: 'plants' }).click();
    const basilCard = page.locator('.plant-card').filter({ hasText: 'Basil' }).first();
    await basilCard.getByRole('button', { name: 'Place' }).click();
    await canvas.click({ position: { x: 96, y: 96 } });

    await page.getByLabel('Observation title').fill('Storm check');
    await page
      .getByLabel('Observation notes')
      .fill('Stake the tomatoes before the next wind event.');
    await page.getByLabel('Observed on').fill('2026-04-13');
    await page.getByRole('button', { name: 'Add observation' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Print sheet' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(downloadPath).not.toBeNull();

    const payload = await fs.readFile(downloadPath!, 'utf8');

    expect(payload).toContain('Printable Garden');
    expect(payload).toContain('printable-garden-print.html');
    expect(payload).toContain('Basil');
    expect(payload).toContain('Static layout snapshot');
    expect(payload).toContain('Prepared in GardenGnome');
    expect(payload).toContain('Storm check');
    expect(payload).toContain('Stake the tomatoes before the next wind event.');
  });

  test('preserves custom plants through export and import', async ({ page }) => {
    await createGarden(page, 'Custom Plant Bundle Garden');

    await page.getByRole('tab', { name: 'plants' }).click();
    await page.getByRole('button', { name: 'Add custom plant' }).click();
    await page.getByLabel('Common name').fill('Shiso');
    await page.getByLabel('Plant family').fill('Lamiaceae');
    await page.getByRole('button', { name: 'Create plant' }).click();

    const shisoCard = page.locator('.plant-card').filter({ hasText: 'Shiso' }).first();
    await expect(shisoCard).toBeVisible();
    await shisoCard.getByRole('button', { name: 'Place' }).click();

    const canvas = page.locator('.planner-stage');
    await canvas.click({ position: { x: 96, y: 96 } });
    await expect(page.locator('.planner-canvas')).toContainText('Shiso');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(downloadPath).not.toBeNull();

    const payload = await fs.readFile(downloadPath!, 'utf8');

    await page.getByRole('link', { name: 'Back to shelf' }).click();
    await expect(page.getByRole('heading', { name: 'Existing Gardens' })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'custom-plant-bundle-garden.json',
      mimeType: 'application/json',
      buffer: Buffer.from(payload),
    });

    await expect(page).toHaveURL(/\/plans\/.+/);
    await expect(page.getByLabel('Plan name')).toHaveValue(
      'Custom Plant Bundle Garden Imported',
    );
    await expect(page.locator('.planner-canvas')).toContainText('Shiso');

    await page.getByRole('tab', { name: 'plants' }).click();
    await expect(page.locator('.plant-card').filter({ hasText: 'Shiso' })).toBeVisible();
  });

  test('preserves journal entries through export and import', async ({ page }) => {
    await createGarden(page, 'Journal Export Garden');

    await page.getByLabel('Observation title').fill('Cold snap recovery');
    await page
      .getByLabel('Observation notes')
      .fill('Basil bounced back after the overnight frost.');
    await page.getByLabel('Observed on').fill('2026-04-13');
    await page.getByRole('button', { name: 'Add observation' }).click();

    await expect(page.getByText('Cold snap recovery')).toBeVisible();
    await expect(
      page.getByText('Basil bounced back after the overnight frost.'),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(downloadPath).not.toBeNull();

    const payload = await fs.readFile(downloadPath!, 'utf8');

    await page.getByRole('link', { name: 'Back to shelf' }).click();
    await expect(page.getByRole('heading', { name: 'Existing Gardens' })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'journal-export-garden.json',
      mimeType: 'application/json',
      buffer: Buffer.from(payload),
    });

    await expect(page).toHaveURL(/\/plans\/.+/);
    await expect(page.getByLabel('Plan name')).toHaveValue('Journal Export Garden Imported');
    await expect(page.getByText('Cold snap recovery')).toBeVisible();
    await expect(
      page.getByText('Basil bounced back after the overnight frost.'),
    ).toBeVisible();
  });

  test('preserves manual seasonal tasks and task status through export and import', async ({
    page,
  }) => {
    await createGarden(page, 'Season Task Garden');

    await page.getByLabel('Task title').fill('Mulch the basil bed');
    await page
      .getByLabel('Task notes')
      .fill('Top up compost before the next hot stretch.');
    await page.getByLabel('Due month').selectOption('6');
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(page.getByText('Mulch the basil bed')).toBeVisible();
    await page.getByRole('button', { name: 'Done Mulch the basil bed' }).click();
    await expect(page.getByText('Done')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(downloadPath).not.toBeNull();

    const payload = await fs.readFile(downloadPath!, 'utf8');

    await page.getByRole('link', { name: 'Back to shelf' }).click();
    await expect(page.getByRole('heading', { name: 'Existing Gardens' })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'season-task-garden.json',
      mimeType: 'application/json',
      buffer: Buffer.from(payload),
    });

    await expect(page).toHaveURL(/\/plans\/.+/);
    await expect(page.getByText('Mulch the basil bed')).toBeVisible();
    await expect(page.getByText('Top up compost before the next hot stretch.')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });
});
