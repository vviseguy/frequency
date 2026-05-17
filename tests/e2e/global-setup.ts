// Spin up a local PeerJS signaling broker so the P2P e2e is fully offline
// and deterministic (no dependency on the public PeerJS cloud).
import { PeerServer } from 'peer';

export default async function globalSetup() {
  await new Promise<void>((resolve) => {
    const server = PeerServer({ port: 9000, path: '/' }, () => resolve());
    (globalThis as Record<string, unknown>).__PEER_SERVER__ = server;
  });
  // eslint-disable-next-line no-console
  console.log('[e2e] local PeerServer listening on :9000');
}
