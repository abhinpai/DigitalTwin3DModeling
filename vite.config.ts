import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@digital-twin-threejs': fileURLToPath(
        new URL('./digital-twin-threejs/src/features/ThreejsCanvas/ThreejsCanvas.tsx', import.meta.url),
      ),
    },
  },
});
