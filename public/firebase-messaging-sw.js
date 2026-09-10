/* eslint-disable no-undef */
// Firebase Messaging service worker for background push notifications.
// Config is passed via URL query params from the main app.

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey") || "",
  authDomain: params.get("authDomain") || "",
  projectId: params.get("projectId") || "",
  storageBucket: params.get("storageBucket") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
});

const messaging = firebase.messaging();
const notificationIcon = new URL("/icons/icon-192.png", self.location.origin).href;

const recentlyShown = new Map();
const DEDUPE_WINDOW_MS = 30_000;

async function showNotificationOnce(title, options) {
  const tag = options.tag;
  const now = Date.now();

  for (const [shownTag, shownAt] of recentlyShown) {
    if (now - shownAt > DEDUPE_WINDOW_MS) recentlyShown.delete(shownTag);
  }

  if (tag) {
    if (recentlyShown.has(tag)) return;
    recentlyShown.set(tag, now);

    // This also covers duplicate delivery to old FCM tokens if the worker was
    // restarted between deliveries.
    const visible = await self.registration.getNotifications({ tag });
    if (visible.length > 0) return;
  }

  await self.registration.showNotification(title, options);
}

messaging.onBackgroundMessage((payload) => {
  // Firebase has already displayed legacy notification payloads before this
  // callback executes. Only data-only messages should be rendered here.
  if (payload.notification) return;

  const notificationTitle = payload.data?.title || "Smart Madrasa";
  const tag =
    "fcm:" + (payload.data?.pushId || payload.messageId || notificationTitle);
  const notificationOptions = {
    body: payload.data?.body || "",
    icon: notificationIcon,
    badge: notificationIcon,
    tag,
    renotify: false,
    data: payload.data || {},
  };

  return showNotificationOnce(notificationTitle, notificationOptions);
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "FCM_SHOW_NOTIFICATION") return;
  event.waitUntil(
    showNotificationOnce(data.title, data.options || {})
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const audience = data?.audience || "parent";
  const fallback = audience === "teacher" ? "/teacher/notifications" : "/parent/notifications";
  const targetUrl = data?.url || fallback;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
