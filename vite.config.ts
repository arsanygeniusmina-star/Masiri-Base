import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'service-worker-no-html-fallback',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const urlPath = req.url?.split('?')[0] || '';
            if (
              urlPath === '/sw.js' ||
              urlPath === '/registerSW.js' ||
              urlPath.endsWith('/dev-sw.js') ||
              urlPath.startsWith('/workbox-')
            ) {
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.end(`// Maseery PWA Service Worker Safe Handler\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));\n`);
              return;
            }
            next();
          });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['masiri-journey-icon.jpg', 'logo-family.jpg', 'logo-church-light.png', 'logo-church-dark.png'],
        manifest: {
          id: '/',
          name: 'THE APOSTLES',
          short_name: 'THE APOSTLES',
          description: 'تطبيق THE APOSTLES لخدمة المرحلة الإعدادية الكنسية - رحلة النمو الروحي والتعليمي للطلاب والخدام',
          theme_color: '#76243A',
          background_color: '#141117',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/masiri-journey-icon.jpg?v=20261010-2',
              sizes: '256x256',
              type: 'image/jpeg',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
