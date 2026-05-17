import { expect, test } from '@playwright/test';
import {
  continueFromScoreboard,
  createRoom,
  joinRoom,
  playRound,
  waitAllPhase,
} from './helpers';

// Three real peers (isolated browser contexts) play a full 2-round game
// end to end over WebRTC against the local PeerJS broker.
test('a full game: host, join, rounds, reveal, recap, back to lobby', async ({
  browser,
}) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const ctxC = await browser.newContext();

  const host = await ctxA.newPage();
  const code = await createRoom(host, '🦊 Host');

  const p2 = await joinRoom(ctxB, code, '🐙 Octo');
  const p3 = await joinRoom(ctxC, code, '🐢 Shelly');
  const pages = [host, p2, p3];

  // everyone sees all three players in the lobby
  for (const p of pages) {
    await expect(p.getByText('🦊')).toBeVisible();
    await expect(p.getByText('🐙')).toBeVisible();
    await expect(p.getByText('🐢')).toBeVisible();
  }

  // shorten to 2 rounds via the host's slider
  const rounds = host.getByTestId('rounds-slider');
  await rounds.focus();
  await rounds.press('Home');
  await expect(rounds).toHaveValue('2');

  await host.getByTestId('start-btn').click();

  // ---- round 1 ----
  await playRound(pages);
  await expect(host.getByTestId('reveal-points')).toBeVisible();
  await continueFromScoreboard(host);

  // ---- round 2 (psychic has rotated) ----
  await playRound(pages);
  await continueFromScoreboard(host);

  // ---- gradual recap -> champion -> back to lobby ----
  await waitAllPhase(pages, 'FINAL_RECAP');
  await expect(host.getByTestId('champion')).toBeVisible({ timeout: 20_000 });
  await expect(host.getByText('Champion of the Frequency')).toBeVisible();

  await host.getByTestId('play-again').click();
  await waitAllPhase(pages, 'LOBBY');
  await expect(p2.getByTestId('lobby-waiting')).toBeVisible();

  await ctxA.close();
  await ctxB.close();
  await ctxC.close();
});
