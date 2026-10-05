import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// VITE_BASE is set to /<repo>/ when building for GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    proxy: {
      '^/node/': { target: 'http://localhost:3000', rewrite: (path) => path.replace(/^\/node/, '') },
      '^/fin/': { target: 'http://localhost:8081', rewrite: (path) => path.replace(/^\/fin/, ''), timeout: 240000 },
    },
  },
});
