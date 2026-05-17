import { expect, type BrowserContext, type Page } from '@playwright/test';

export const APP = '/frequency/';

export async function phaseOf(page: Page): Promise<string | null> {
  return page.getByTestId('phase').getAttribute('data-phase');
}

export async function waitPhase(page: Page, phase: string, timeout = 40_000) {
  await expect
    .poll(() => phaseOf(page), { timeout, message: `waiting for phase ${phase}` })
    .toBe(phase);
}

export async function waitAllPhase(pages: Page[], phase: string, timeout = 40_000) {
  await Promise.all(pages.map((p) => waitPhase(p, phase, timeout)));
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto(APP);
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('host-btn').click();
  await waitPhase(page, 'LOBBY');
  const code = (await page.getByTestId('room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z]{4}$/);
  return code;
}

export async function joinRoom(
  context: BrowserContext,
  code: string,
  _name: string,
): Promise<Page> {
  const page = await context.newPage();
  // ?room= triggers auto-rejoin (the host-refresh recovery path); no clicks.
  await page.goto(`${APP}?room=${code}`);
  await waitPhase(page, 'LOBBY');
  return page;
}

/**
 * Drive the new flow from a host page until the scoreboard: everyone submits
 * a clue at once, then the game auto-cycles each player's clue with the rest
 * locking in. Polls and reacts to whatever phase the host is in.
 */
export async function playUntilScoreboard(pages: Page[], host: Page, budgetMs = 90_000) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const ph = await phaseOf(host);
    if (ph === 'SCOREBOARD') return;

    if (ph === 'CLUE') {
      for (const p of pages) {
        const input = p.getByTestId('clue-input');
        if (await input.isVisible().catch(() => false)) {
          await input.fill('on the nose');
          await p.getByTestId('submit-clue').click().catch(() => {});
        }
      }
    } else if (ph === 'GUESS') {
      for (const p of pages) {
        const ready = p.getByTestId('ready-toggle');
        if (await ready.isVisible().catch(() => false)) {
          if ((await ready.getAttribute('data-ready')) !== 'true') {
            await ready.click().catch(() => {});
          }
        }
      }
    }
    // REVEAL just auto-advances — wait it out
    await host.waitForTimeout(600);
  }
  throw new Error('playUntilScoreboard: timed out');
}
