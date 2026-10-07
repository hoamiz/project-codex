import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwind()],
  server: { proxy: { '/api': process.env.API_TARGET || 'http://127.0.0.1:4100' } },
  build: { manifest: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
