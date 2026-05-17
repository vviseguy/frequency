// PeerJS lifecycle helpers. Signaling uses PeerJS's free public broker;
// media/data is real P2P WebRTC. STUN (and optional TURN via env) help
// punch through NAT.
import Peer from 'peerjs';

const ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

// Optional TURN relay for strict/cellular networks: set both env vars.
const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
if (turnUrl) {
  ICE.push({
    urls: turnUrl,
    username: import.meta.env.VITE_TURN_USER as string | undefined,
    credential: import.meta.env.VITE_TURN_CRED as string | undefined,
  });
}

export interface PeerOpts {
  host?: string;
  port?: number;
  path?: string;
}

/** Create a Peer with our id. Resolves once the broker confirms the id. */
export function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const customHost = import.meta.env.VITE_PEER_HOST as string | undefined;
    const peer = new Peer(id as string, {
      debug: 1,
      config: { iceServers: ICE },
      ...(customHost
        ? {
            host: customHost,
            port: Number(import.meta.env.VITE_PEER_PORT ?? 443),
            path: (import.meta.env.VITE_PEER_PATH as string) ?? '/',
            secure: true,
          }
        : {}),
    });
    let settled = false;
    peer.on('open', () => {
      settled = true;
      resolve(peer);
    });
    peer.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}
