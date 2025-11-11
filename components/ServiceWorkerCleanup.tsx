'use client';

import { useEffect } from 'react';

const STALE_PATTERNS = ['dev-sw', '@vite', 'vite-plugin-pwa'];
const STALE_CACHE_HINTS = ['vite', 'pwa-entry', 'workbox'];

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          const scriptURL =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            '';

          const shouldRemove = STALE_PATTERNS.some((keyword) => scriptURL.includes(keyword));

          if (shouldRemove) {
            registration.unregister().catch(() => {
              /* 忽略 */
            });
          }
        });
      })
      .catch(() => {
        /* 忽略 */
      });

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          keys
            .filter((key) => STALE_CACHE_HINTS.some((keyword) => key.includes(keyword)))
            .forEach((key) => {
              caches.delete(key).catch(() => {
                /* 忽略 */
              });
            });
        })
        .catch(() => {
          /* 忽略 */
        });
    }
  }, []);

  return null;
}

export default ServiceWorkerCleanup;
