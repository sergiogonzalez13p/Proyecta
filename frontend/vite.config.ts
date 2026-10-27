import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss(), autoprefixer()] } },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['3000-ilk71zlbzuk13ah2y0mtn-c91fe3e9.us5.manus.computer'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
});
