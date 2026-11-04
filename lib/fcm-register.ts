import { requestFcmToken, deleteFcmToken, dismissActiveNotifications } from "@/lib/firebase";
import {
  registerParentFcmToken,
  registerTeacherFcmToken,
  unregisterParentFcmToken,
  unregisterTeacherFcmToken,
  unregisterDeviceFcmToken,
} from "@/lib/fcm-api";
import { useAuthStore } from "@/store/auth";

let currentFcmToken: string | null = null;

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

  const isParent = user.actorType === "PARENT" || user.role === "parent";
  const isTeacher = user.actorType === "TEACHER" || user.role === "teacher";
  if (!isParent && !isTeacher) {
    console.log("[FCM] Skipping: not a parent or teacher");
    return;
  }

  try {
    console.log("[FCM] Requesting FCM token...");
    const token = await requestFcmToken(undefined, serviceWorkerRegistration);
    console.log("[FCM] Got token:", token ? token + "..." : "null");
    if (!token) return;

    currentFcmToken = token;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("fcm_device_token", token);
      } catch {
        // Ignore storage quotas / access restrictions
      }
    }

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

export async function unregisterPushToken(
  targetClientId?: string,
  role?: string,
): Promise<void> {
  const { user, accessToken, activeClientId, sessions } = useAuthStore.getState();
  const clientId = targetClientId ?? user?.clientId ?? activeClientId;
  const token =
    currentFcmToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("fcm_device_token")
      : null);

  if (!clientId || !token) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fcm_device_token");
      } catch {}
    }
    return;
  }

  const targetRole = role ?? user?.role;
  const isParent = targetRole === "parent" || (targetRole === undefined && user?.actorType === "PARENT");
  const isTeacher = targetRole === "teacher" || (targetRole === undefined && user?.actorType === "TEACHER");

  // Check if other sessions remain on this device (e.g. user was logged in as both teacher and parent)
  const remainingRoles = Object.keys(sessions ?? {}).filter((r) => r !== targetRole);
  const hasRemainingSessions = remainingRoles.length > 0;

  // 1. Unregister the specific role token
  if (accessToken && isParent) {
    await unregisterParentFcmToken(clientId, token, accessToken).catch(() => undefined);
  } else if (accessToken && isTeacher) {
    await unregisterTeacherFcmToken(clientId, token, accessToken).catch(() => undefined);
  }

  // 2. If no remaining sessions on this device, unregister device token completely and dismiss notifications
  if (!hasRemainingSessions) {
    await unregisterDeviceFcmToken(clientId, token).catch(() => undefined);
    await dismissActiveNotifications().catch(() => undefined);
    currentFcmToken = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fcm_device_token");
      } catch {}
    }
    await deleteFcmToken().catch(() => undefined);
  }
}

export async function registerParentPushToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration,
): Promise<void> {
  return registerPushToken(serviceWorkerRegistration);
}
