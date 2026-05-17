/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly VITE_PEER_HOST?: string;
  readonly VITE_PEER_PORT?: string;
  readonly VITE_PEER_PATH?: string;
  readonly VITE_PEER_SECURE?: string;
  readonly VITE_TURN_URL?: string;
  readonly VITE_TURN_USER?: string;
  readonly VITE_TURN_CRED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
