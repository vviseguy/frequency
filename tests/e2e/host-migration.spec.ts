import { expect, test } from '@playwright/test';
import { createRoom, joinRoom, phaseOf, waitPhase } from './helpers';

// Kill the host mid-lobby; the most-senior survivor must seamlessly take
// over (deterministic generation-numbered peer-id migration) and be able to
// keep running the game.
test('host drops -> most senior player takes over', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const ctxC = await browser.newContext();

  const host = await ctxA.newPage();
  const code = await createRoom(host, '🦊 Host');

  const p2 = await joinRoom(ctxB, code, '🐙 Senior'); // joins first -> successor
  const p3 = await joinRoom(ctxC, code, '🐢 Junior');

  await expect(host.getByTestId('phase')).toHaveAttribute('data-role', 'host');

  // the host vanishes
  await ctxA.close();

  // p2 (most senior survivor) becomes the new host within the migration window
  await expect(p2.getByTestId('phase')).toHaveAttribute('data-role', 'host', {
    timeout: 45_000,
  });
  await expect(p2.getByTestId('start-btn')).toBeVisible();

  // p3 stays in the room, reconnected to the new host, still a peer
  await waitPhase(p3, 'LOBBY', 45_000);
  await expect(p3.getByTestId('phase')).toHaveAttribute('data-role', 'peer');

  // the new host can actually drive the game forward
  await p2.getByTestId('start-btn').click();
  await expect.poll(() => phaseOf(p2), { timeout: 30_000 }).not.toBe('LOBBY');
  await expect.poll(() => phaseOf(p3), { timeout: 30_000 }).not.toBe('LOBBY');

  await ctxB.close();
  await ctxC.close();
});
