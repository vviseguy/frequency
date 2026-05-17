import { expect, type BrowserContext, type Page } from '@playwright/test';

export const APP = '/frequency/';

export async function phaseOf(page: Page): Promise<string | null> {
  return page.getByTestId('phase').getAttribute('data-phase');
}

export async function waitPhase(page: Page, phase: string, timeout = 30_000) {
  await expect
    .poll(() => phaseOf(page), { timeout, message: `waiting for phase ${phase}` })
    .toBe(phase);
}

export async function waitAllPhase(pages: Page[], phase: string, timeout = 30_000) {
  await Promise.all(pages.map((p) => waitPhase(p, phase, timeout)));
}

/** Host a fresh room; returns the page + its 4-letter room code. */
export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto(APP);
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('host-btn').click();
  await waitPhase(page, 'LOBBY');
  const code = (await page.getByTestId('room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z]{4}$/);
  return code;
}

/** Open a new player in its own context (isolated storage) and join. */
export async function joinRoom(
  context: BrowserContext,
  code: string,
  name: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${APP}?room=${code}`);
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('join-btn').click();
  await waitPhase(page, 'LOBBY', 30_000);
  return page;
}

/**
 * Drive one full round across every page, whoever happens to be the psychic:
 * the psychic submits a clue, every guesser locks in, reveal appears.
 */
export async function playRound(pages: Page[]) {
  await waitAllPhase(pages, 'CLUE');

  for (const p of pages) {
    const clue = p.getByTestId('clue-input');
    if (await clue.isVisible().catch(() => false)) {
      await clue.fill('on the nose');
      await p.getByTestId('submit-clue').click();
    }
  }

  await waitAllPhase(pages, 'GUESS');

  for (const p of pages) {
    const ready = p.getByTestId('ready-toggle');
    if (await ready.isVisible().catch(() => false)) {
      if ((await ready.getAttribute('data-ready')) !== 'true') await ready.click();
    }
  }

  await waitAllPhase(pages, 'REVEAL');
}

/** From REVEAL, wait for the auto-advance to SCOREBOARD then host continues. */
export async function continueFromScoreboard(host: Page) {
  await waitPhase(host, 'SCOREBOARD', 20_000);
  await host.getByTestId('next-round').click();
}
