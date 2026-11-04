import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  Messaging,
  MessagePayload,
  onMessage,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyACABU-YpnQQ1rQBq5W-7r_itBYhPKWauk",
  authDomain: "madrasa-app-push-notification.firebaseapp.com",
  projectId: "madrasa-app-push-notification",
  storageBucket: "madrasa-app-push-notification.firebasestorage.app",
  messagingSenderId: "140700185441",
  appId: "1:140700185441:web:cec6824f02e0656025cb20",
  measurementId: "G-X7VVB79F28"
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  const fbApp = getFirebaseApp();
  if (!fbApp) {
    return null;
  }
  if (!messaging && typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      messaging = getMessaging(fbApp);
    } catch {
      messaging = null;
    }
  }
  return messaging;
}

export async function requestFcmToken(
  vapidKey?: string,
  serviceWorkerRegistration?: ServiceWorkerRegistration,
): Promise<string | null> {
  if (!("Notification" in window)) {
    console.log("[FCM] Notification API not available");
    return null;
  }

  console.log("[FCM] Current permission:", Notification.permission);
  const permission = await Notification.requestPermission();
  console.log("[FCM] Permission result:", permission);
  if (permission !== "granted") {
    console.log("[FCM] Notification permission not granted");
    return null;
  }

  const msg = getFirebaseMessaging();
  if (!msg) {
    console.log("[FCM] Firebase messaging not available");
    return null;
  }

  // If no registration passed, wait for any existing SW to be ready
  let swReg = serviceWorkerRegistration;
  if (!swReg && "serviceWorker" in navigator) {
    try {
      swReg = await navigator.serviceWorker.ready;
      console.log("[FCM] Got SW from ready promise:", swReg?.scope);
    } catch (e) {
      console.log("[FCM] No SW ready:", e);
    }
  }

  try {
    const vKey = vapidKey ?? "BLefby21O0x24Kf2RF8ghutZX7yizb2eI-JZR7Nn76poxn2e_QbyvyJe7f8dIM5Hun5hTFI4QM-ufIGO7NRNAWc";

    const token = await getToken(msg, {
      vapidKey: vKey,
      serviceWorkerRegistration: swReg,
    });
    console.log("[FCM] Token result:", token );
    return token || null;
  } catch (err) {
    console.error("[FCM] getToken failed:", err);
    return null;
  }
}

export async function deleteFcmToken(): Promise<boolean> {
  const msg = getFirebaseMessaging();
  if (!msg) return false;
  try {
    return await deleteToken(msg);
  } catch (err) {
    console.error("[FCM] deleteToken failed:", err);
    return false;
  }
}

export async function dismissActiveNotifications(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const notifs = await reg.getNotifications();
      for (const n of notifs) {
        n.close();
      }
    }
  } catch (err) {
    console.warn("[FCM] Failed to dismiss active notifications:", err);
  }
}

export function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): (() => void) | undefined {
  const msg = getFirebaseMessaging();
  if (!msg) return undefined;
  return onMessage(msg, (payload) => {
     handler(payload);
  });
}
