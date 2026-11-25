import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2020', sourcemap: false, assetsInlineLimit: 0 },
  server: { port: 5173 },
});
