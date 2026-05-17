import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Project is served from https://<user>.github.io/frequency/
// Routing keys off the ?room= query param, not paths, so this base is safe.
export default defineConfig({
  base: '/frequency/',
  plugins: [react()],
  server: { host: true }, // expose on LAN so you can test on real phones
});
