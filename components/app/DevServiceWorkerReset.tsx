"use client";

import { useEffect } from "react";

export default function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
      return;
    }

    const clearStalePwaState = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        }
      } catch (error) {
        console.warn("Failed to clear stale service worker state in development.", error);
      }
    };

    void clearStalePwaState();
  }, []);

  return null;
}
