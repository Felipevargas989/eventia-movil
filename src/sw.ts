/// <reference lib="webworker" />
// Service worker de Eventia Móvil: cachea el cascarón (workbox) y
// recibe los PUSH del backend — al tocar la notificación, la app abre
// directo en el detalle (deep link del handoff).
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

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
