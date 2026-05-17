export default async function globalTeardown() {
  const server = (globalThis as Record<string, unknown>).__PEER_SERVER__ as
    | { close?: (cb?: () => void) => void }
    | undefined;
  if (server?.close) await new Promise<void>((r) => server.close!(() => r()));
}
