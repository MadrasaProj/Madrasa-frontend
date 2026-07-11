import { requestFcmToken } from "@/lib/firebase";
import { registerParentFcmToken, registerTeacherFcmToken } from "@/lib/fcm-api";
import { useAuthStore } from "@/store/auth";

export async function registerPushToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration,
): Promise<void> {
  const { user, accessToken } = useAuthStore.getState();
  console.log("[FCM] registerPushToken called", {
    hasUser: !!user,
    actorType: user?.actorType,
    role: user?.role,
    clientId: user?.clientId,
    hasToken: !!accessToken,
  });
  if (!user || !user.clientId || !accessToken) {
    console.log("[FCM] Skipping: missing auth");
    return;
  }

  const isParent = user.actorType === "PARENT";
  const isTeacher = user.role === "teacher" || user.actorType === "TEACHER";
  if (!isParent && !isTeacher) {
    console.log("[FCM] Skipping: not a parent or teacher");
    return;
  }

  try {
    console.log("[FCM] Requesting FCM token...");
    const token = await requestFcmToken(undefined, serviceWorkerRegistration);
    console.log("[FCM] Got token:", token ? token + "..." : "null");
    if (!token) return;
    console.log("[FCM] Registering token with backend...");
    if (isParent) {
      await registerParentFcmToken(user.clientId, token, accessToken, "web");
    } else if (isTeacher) {
      await registerTeacherFcmToken(user.clientId, token, accessToken, "web");
    }
    console.log("[FCM] Token registered successfully");
  } catch (err) {
    console.error("[FCM] Failed to register push token:", err);
  }
}

export async function registerParentPushToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration,
): Promise<void> {
  return registerPushToken(serviceWorkerRegistration);
}
