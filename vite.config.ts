import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Le générateur Gemini a été retiré (c'était un test) : plus de middleware /api,
// plus de dépendance côté build. La génération de séances passe par Notion.
export default defineConfig(() => {
  return {
    // Le site est servi à la RACINE de son domaine (https://train.huvioptimisation.com/)
    // et non plus sous /PEAKworkouts/. Une base RELATIVE ('./') fonctionne dans les DEUX
    // cas (domaine custom à la racine ET URL de projet /PEAKworkouts/) — c'est ce qui évite
    // de repasser en page blanche au prochain changement de domaine.
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
