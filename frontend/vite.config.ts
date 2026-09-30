import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function tailwindVitePlugin(): PluginOption[] {
  // @tailwindcss/vite carga oxide (Node >= 20). Vitest no procesa el CSS de la app
  // y en este entorno los tests corren con el Node del host; el plugin sí entra
  // en `vite` / `vite build` (imagen Node 22).
  if (process.env.VITEST) {
    return [];
  }

  const tailwindcss = require('@tailwindcss/vite') as {
    default: () => PluginOption;
  };
  return [tailwindcss.default()];
}

export default defineConfig({
  plugins: [react(), ...tailwindVitePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.spec.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        lines: 80,
      },
    },
  },
});
