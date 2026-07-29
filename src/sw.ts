/// <reference lib="webworker" />
// Service worker de Eventia Móvil: cachea el cascarón (workbox) y
// recibe los PUSH del backend — al tocar la notificación, la app abre
// directo en el detalle (deep link del handoff).
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

// ACTUALIZACIÓN AUTOMÁTICA (29-07, la lección): sin estas dos líneas
// la versión nueva queda "esperando" eternamente y la app parece no
// actualizarse nunca. Con ellas: cerrar y abrir = versión nueva.
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

// OFFLINE pragmático (Fase 5): las LECTURAS del backend se guardan y,
// sin señal, la app muestra lo último conocido (el banner ámbar avisa).
// Las escrituras sin señal fallan con mensaje claro — la cola con
// reintento queda para la etapa siguiente.
registerRoute(
  ({ url, request }) =>
    request.method === "GET" && url.hostname.endsWith("railway.app"),
  new NetworkFirst({
    cacheName: "eventia-api",
    networkTimeoutSeconds: 6,
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 3 }),
    ],
  }),
);

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Eventia", {
      body: data.body || "",
      icon: "/icono-192.png",
      badge: "/icono-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((ventanas) => {
        for (const v of ventanas) {
          void v.navigate(url);
          return v.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
});
