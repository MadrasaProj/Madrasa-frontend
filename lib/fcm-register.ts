import { requestFcmToken } from "@/lib/firebase";
import { registerParentFcmToken } from "@/lib/fcm-api";
import { useAuthStore } from "@/store/auth";

export async function registerParentPushToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration,
): Promise<void> {
  const { user, accessToken } = useAuthStore.getState();
  console.log("[FCM] registerParentPushToken called", {
    hasUser: !!user,
    actorType: user?.actorType,
    clientId: user?.clientId,
    hasToken: !!accessToken,
  });
  if (!user || user.actorType !== "PARENT" || !user.clientId || !accessToken) {
    console.log("[FCM] Skipping: not a parent or missing auth");
    return;
  }

  try {
    console.log("[FCM] Requesting FCM token...");
    const token = await requestFcmToken(undefined, serviceWorkerRegistration);
    console.log("[FCM] Got token:", token ? token.substring(0, 20) + "..." : "null");
    if (!token) return;
    console.log("[FCM] Registering token with backend...");
    await registerParentFcmToken(user.clientId, token, accessToken, "web");
    console.log("[FCM] Token registered successfully");
  } catch (err) {
    console.error("[FCM] Failed to register parent push token:", err);
  }
}
