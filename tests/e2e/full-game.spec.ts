import { expect, test } from '@playwright/test';
import {
  createRoom,
  joinRoom,
  phaseOf,
  playUntilScoreboard,
  waitAllPhase,
} from './helpers';

// Two real peers (isolated contexts) play a full game over WebRTC against
// the local PeerJS broker: simultaneous clues, the group cycling through
// each clue, scoreboards between sets, recap, then back to the lobby.
test('full game: simultaneous clues, cycle, recap, back to lobby', async ({ browser }) => {
  test.setTimeout(180_000);

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();

  const host = await ctxA.newPage();
  const code = await createRoom(host, '🦊 Host');
  const p2 = await joinRoom(ctxB, code, '🐙 Octo');
  const pages = [host, p2];

  for (const p of pages) await expect(p.getByTestId('player-chip')).toHaveCount(2);

  await host.getByTestId('start-btn').click();
  await waitAllPhase(pages, 'CLUE');

  // 2 players -> 3 sets (small-group sizing). Play each set, host advances.
  for (let set = 1; set <= 3; set++) {
    await playUntilScoreboard(pages, host);
    await expect(host.getByTestId('next-round')).toBeVisible();
    await host.getByTestId('next-round').click();
  }

  await waitAllPhase(pages, 'FINAL_RECAP');
  await expect(host.getByTestId('champion')).toBeVisible({ timeout: 25_000 });
  await expect(host.getByText('Champion of the Frequency')).toBeVisible();

  await host.getByTestId('play-again').click();
  await waitAllPhase(pages, 'LOBBY');
  expect(await phaseOf(p2)).toBe('LOBBY');

  await ctxA.close();
  await ctxB.close();
});
