import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  Messaging,
  MessagePayload,
  onMessage,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Firebase initialization failed:", err);
      return null;
    }
  }
  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  try {
    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch {
    return null;
  }
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
    const vKey = vapidKey ?? import.meta.env.VITE_FIREBASE_VAPID_KEY;
    console.log("[FCM] Requesting token, vapidKey present:", !!vKey, "swReg:", !!swReg);
    const token = await getToken(msg, {
      vapidKey: vKey,
      serviceWorkerRegistration: swReg,
    });
    console.log("[FCM] Token result:", token ? "GOT TOKEN" : "EMPTY");
    return token || null;
  } catch (err) {
    console.error("[FCM] getToken failed:", err);
    return null;
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
