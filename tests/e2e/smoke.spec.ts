import { expect, test } from '@playwright/test';
import { APP, createRoom, phaseOf } from './helpers';

test('home screen renders and a room can be hosted', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByText('Read the room')).toBeVisible();
  await expect(page.getByTestId('host-btn')).toBeVisible();

  const code = await createRoom(page, '🦊 Smoke Host');

  expect(code).toMatch(/^[A-Z]{4}$/);
  expect(await phaseOf(page)).toBe('LOBBY');
  await expect(page.getByTestId('phase')).toHaveAttribute('data-role', 'host');
  await expect(page.getByTestId('start-btn')).toBeVisible();
  await expect(page.getByText('Share invite')).toBeVisible();
});
