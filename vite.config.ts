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
        includeAssets: [
          'masiri-journey-icon.jpg',
          'logo-family.jpg',
          'logo-church-light.png',
          'logo-church-dark.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'THE APOSTLES',
          short_name: 'THE APOSTLES',
          description:
            'تطبيق THE APOSTLES لخدمة المرحلة الإعدادية الكنسية - رحلة النمو الروحي والتعليمي للطلاب والخدام',
          theme_color: '#76243A',
          background_color: '#141117',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['lifestyle', 'education', 'religion'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/masiri-journey-icon.jpg?v=20261010-2',
              sizes: '256x256',
              type: 'image/jpeg',
              purpose: 'any',
            },
          ],
          shortcuts: [
            {
              name: 'إصحاح النهارده',
              short_name: 'إصحاح اليوم',
              description: 'افتح قراءة اليوم بسرعة من أيقونة التطبيق',
              url: '/my-readings',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'سلسلة القراءة',
              short_name: 'السلسلة',
              description: 'شاهد سلسلة قراءتك اليومية المتتالية',
              url: '/profile',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'طلب صلاة',
              short_name: 'صلاة',
              description: 'أرسل طلب صلاة أو سؤال روحي',
              url: '/student-dashboard',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'الأدوات المصغرة',
              short_name: 'أدوات',
              description: 'إدارة الأدوات المصغرة والاختصارات',
              url: '/widgets',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
          screenshots: [
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'wide',
              label: 'THE APOSTLES - شاشة principale',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'THE APOSTLES - شاشة الجوال',
            },
          ],
          share_target: {
            action: '/share',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
            },
          },
        },
        // Push notifications (shown even when the app is closed): public/push-sw.js
        workbox: {
          importScripts: ['push-sw.js'],
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
