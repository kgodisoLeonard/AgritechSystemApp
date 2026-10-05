import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// VITE_BASE is set to /<repo>/ when building for GitHub Pages.
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [react()] });
